# Menú en línea 1b‑1 — el lienzo

Fecha: 2026-08-22
Estado: aprobado

Sub-proyecto del módulo "Menú en línea".
Padre: `2026-08-21-online-menu-roadmap.md`
Antecesor directo: `2026-08-22-online-menu-engine-design.md` (1a, ya en `main`).

## Objetivo

Reemplazar el formulario del editor por un lienzo: una lista real de bloques que
el dueño reordena arrastrando, oculta, quita y agrega, con vista previa que se
actualiza mientras lo hace.

## Alcance

Dentro:

- Lista de bloques como estado único del editor, con drag & drop vertical.
- Ocultar y quitar bloques; agregar categorías, portada y pie.
- Portada y pie se comportan como cualquier bloque, con un límite de uno de cada.
- Vista previa en un `iframe`, actualizada por `postMessage` sin guardar ni recargar.
- Selector de ancho celular / escritorio en la vista previa.
- Autoguardado del borrador; el enlace público sigue siendo un cambio explícito.

Fuera (otros sub-proyectos de 1b):

- Variantes de presentación por bloque, doble columna (1b‑2).
- Tema global: logo, colores, tipografía (1b‑3).
- Clonado del menú entre sedes (1b‑4).
- Editor táctil en celular. El editor asume pantalla ancha; en angosta muestra
  un aviso de una línea y nada más.

## Punto de partida

Dos hechos del código actual determinan el tamaño de este trabajo.

**El esquema guardado ya es una lista ordenada de bloques con `visible`.**
`normalizeMenuDraft` conserva el orden de entrada y `renderableBlocks` ya
descarta los bloques con `visible === false`. Lo único que impide reordenar y
ocultar hoy es que el editor no lo expresa: `buildDraft()` en
`src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx` reconstruye la
lista desde tres estados sueltos, con portada siempre primera y pie siempre
último.

Consecuencia: **1b‑1 no cambia el esquema y no migra ningún menú publicado.**
`MENU_SCHEMA_VERSION` sigue en 1.

**La página pública renderiza `menu.published`, no el borrador.** Guardar un
borrador no cambia nada de lo que sirve `/m/<slug>`, así que el autoguardado no
necesita revalidar la caché. El `revalidatePath` que hoy corre en cada `PUT`
solo es necesario cuando se mueve el slug.

## Arquitectura

### Componentes de presentación compartidos

`src/app/m/[slug]/menu-blocks.jsx` se muda a `src/app/components/menu/menu-blocks.jsx`.
Sus componentes ya son funciones puras de sus props, así que sirven igual en el
árbol de servidor de la página pública y en el árbol de cliente de la vista previa.

`groupProductsBySize` se muda de `src/app/m/[slug]/page.jsx` a
`src/app/lib/menu/groupProductsBySize.js`. Hoy vive dentro de un Server
Component y por eso no tiene ninguna prueba; al salir, pasa a ser un módulo puro
testeable.

Se agrega `MenuBlockList` en `src/app/components/menu/menu-blocks.jsx`: el
despacho bloque → componente que hoy está escrito inline en la página pública.
Recibe `blocks`, `categoryMap`, `productsByCategory`, `sizeOrderMap` y
`formatPrice`, y no hace ningún acceso a datos. Los tres mapas son `Map`; cada
consumidor los arma desde su propia fuente.

`MenuBlockList` aplica `renderableBlocks` internamente sobre los `blocks` que
recibe, en vez de esperar una lista ya filtrada. Así ocultar un bloque y
desactivar una categoría se comportan igual en la previa que en el menú público
sin que nadie tenga que acordarse de filtrar en los dos lados. La página pública
sigue llamando a `renderableBlocks` por su cuenta, porque necesita la lista
filtrada antes de renderizar para armar la consulta de productos y para el
`notFound()` de menú sin contenido visible; que se calcule dos veces es
irrelevante y a cambio no hay forma de que las dos vistas filtren distinto.

La página pública y la vista previa importan el mismo `MenuBlockList`. La previa
no puede desviarse del renderizador real porque no hay dos códigos que puedan
divergir. Esto es un requisito del diseño, no una comodidad: una vista previa
que miente es peor que no tener vista previa.

### Estado del editor

`src/app/lib/menu/menuBlockList.js`, módulo puro:

- `moveBlock(blocks, fromIndex, toIndex)`
- `removeBlock(blocks, blockId)`
- `toggleBlockVisibility(blocks, blockId)`
- `updateBlockData(blocks, blockId, patch)`
- `addBlock(blocks, type, data)`
- `canAddType(blocks, type)` — `false` para `hero` y `footer` si ya existe uno
- `availableCategories(blocks, categories)` — activas que todavía no son bloque

El estado del editor pasa a ser la lista de bloques. Los estados `hero`,
`footer` y `categories` y la función `buildDraft()` desaparecen.

Los ids de bloque los genera el editor: `hero`, `footer`, `category-<categoryId>`.
`normalizeMenuDraft` ya reasigna cualquier id repetido que llegue al servidor, así
que el editor no necesita garantizar unicidad, pero tampoco debe romperla a
propósito.

### Vista previa

Ruta nueva: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview/page.jsx`,
componente de cliente. No es una página que el dueño visite: existe para ser el
contenido del `iframe`.

Protocolo, en este orden:

1. La previa monta, pide sus datos a `preview-data` una vez y renderiza vacío.
2. La previa envía `{ type: 'menu-preview-ready' }` al padre.
3. El padre responde con `{ type: 'menu-preview-blocks', blocks }` y repite el
   envío en cada cambio de la lista.
4. El padre reenvía también en el evento `load` del `iframe`, por si la previa
   se recarga sola (HMR en desarrollo).

Sin el paso 2 hay una carrera: el padre puede mandar antes de que la previa
tenga su `listener` puesto, y el primer dibujo sale vacío sin motivo aparente.

Origen: el padre envía siempre a `window.location.origin`, nunca a `'*'`. La
previa descarta todo mensaje cuyo `event.origin` no sea igual a
`window.location.origin`. Las dos validaciones son obligatorias, no defensivas:
un `iframe` de mismo origen dentro de una página autenticada es exactamente el
escenario donde un `postMessage` sin filtrar se convierte en un canal de
inyección desde cualquier ventana que tenga una referencia a esta.

La ruta hereda la protección del middleware sin cambios:
`resolveAdminPanelFromPath` (`src/app/lib/security/resolveModule.js`) solo mira
los segmentos `admin/{companyId}`, y el middleware exige dueño con `companyId`
coincidente para cualquier sub-ruta.

### Datos de la vista previa

`GET /api/company/sedes/[tenantId]/menu/preview-data`, owner-scoped con
`requireOwnerSede(req, tenantId, 'online-menu')`.

Devuelve, para **todas** las categorías activas (no solo las que hoy son bloque,
porque la lista cambia en vivo y un refetch por cada categoría agregada haría
saltar la previa):

- `categories`: arreglo de `{ id, label, hasSizes }`, solo las que cumplen
  `active === true`
- `products`: arreglo de `{ id, name, price, description, image, sizeId,
  categoryId }`, los mismos campos que arma la página pública
- `sizes`: arreglo de `{ id, label, order }`
- `currency`: para formatear precios igual que la página pública
- `truncated`: booleano

Todo arreglos, no `Map`: JSON no transporta `Map`. La previa arma los tres
`Map` que `MenuBlockList` espera al recibir la respuesta.

El mismo techo de 500 productos que usa la página pública. Al alcanzarlo,
`truncated: true` y la previa lo dice en un cartel. Una previa recortada que no
avisa es una previa que miente.

### Endpoints de guardado

`PUT /api/company/sedes/[tenantId]/menu` hoy hace dos cosas: guarda el borrador
y reasigna el slug, y revalida la caché pública en ambos casos. Autoguardar
contra ese endpoint escribiría en la base master y tiraría la caché en cada
pausa de tecleo. Se parte en dos:

| Endpoint | Qué hace | Cuándo lo llama el editor |
|---|---|---|
| `PUT .../menu` | Solo el borrador. Sin slug, sin `revalidatePath`. | Automático |
| `PUT .../menu/slug` | Solo el slug, con `revalidatePath` del viejo y el nuevo. | Explícito |

Dos endpoints y no un `menuSlug` opcional a propósito: un campo opcional obliga
a distinguir "ausente" de `""` en cada llamada, y equivocarse en esa distinción
mueve una URL pública sin que nadie lo haya pedido. Los QR impresos no se
reemiten.

`PUT .../menu` deja de leer `body.menuSlug` por completo, y deja de revalidar:
el borrador no es público.

`PUT .../menu/slug` conserva íntegra la lógica actual de slug, incluido el mapa
`SLUG_ASSIGN_ERROR_STATUS` y la revalidación de la ruta vieja y la nueva.

`POST .../menu/publish` no cambia.

### Autoguardado

`src/app/lib/menu/createAutosave.js`, con el temporizador inyectado para poder
probarlo con relojes falsos.

- Debounce de 1500 ms desde el último cambio.
- Nunca dos peticiones en vuelo. Si llega un cambio mientras una corre, se
  encola **una sola** pendiente; una segunda reemplaza a la encolada. Sin esto,
  un arrastre rápido dispara varios `PUT` y el borrador que queda guardado es el
  de la respuesta que llegue última, no el último estado del editor.
- Ante un fallo, la cadena se detiene y el editor muestra un aviso persistente
  con "reintentar". No reintenta solo: martillar un endpoint que falla no lo
  arregla y esconde el problema.
- `flush()` fuerza el guardado pendiente y resuelve cuando terminó. Publicar
  llama a `flush()` primero, igual que hoy guarda antes de publicar.
- Si queda algo sin guardar al cerrar la pestaña, `beforeunload`.

Indicador de estado en el editor: "Guardando…", "Guardado", o el aviso de error.
El botón "Guardar borrador" desaparece: con autoguardado, un botón que a veces
no tiene nada que guardar enseña a desconfiar del indicador. Quedan "Publicar" y
el botón propio del enlace.

Dispara autoguardado cualquier cambio en la lista de bloques: reordenar,
ocultar, quitar, agregar y editar campos. No lo dispara el campo del enlace.

## Interfaz del editor

Dos paneles, `grid` de dos columnas en pantalla ancha.

**Izquierda — la lista.** Cada bloque es una fila con manija de arrastre, título
(el tipo, o el nombre de la categoría), botón de ocultar y botón de quitar. Al
hacer clic la fila se expande con sus campos:

- portada: título y subtítulo
- pie: texto, dirección, teléfono
- categoría: las casillas `showPhotos` y `showDescriptions` que ya existen

Un bloque oculto se ve atenuado y desaparece de la previa, igual que desaparece
del menú público.

Arriba, botón "Agregar" con un menú: las categorías activas que todavía no son
bloque, más portada y pie cuando `canAddType` lo permite.

Drag & drop con `@dnd-kit` (ya instalado, ya usado en `data-table.jsx`), con
manija explícita y `restrictToVerticalAxis`.

**Derecha — el `iframe`.** Con dos botones que le fijan el ancho: celular
(390 px) y escritorio (100%). Ese es el motivo de usar `iframe` y no renderizar
en el panel: dentro del `iframe` el ancho es real, así que cuando 1b‑2 agregue
doble columna, el modo celular va a mostrar una sola columna de verdad. Un
contenedor angosto dentro de una ventana ancha mostraría dos.

**Enlace público.** Sección propia, con su campo, su advertencia sobre los QR
impresos y su propio botón. No entra en el autoguardado.

**Pantalla angosta.** El corte a dos columnas es `lg` (1024 px), el mismo que ya
usa el resto del proyecto para el sidebar. Por debajo, el editor no se usa: se
muestra un aviso de una línea explicando que hace falta una pantalla más ancha.
Es lo único que 1b‑1 hace por el celular, y existe para que nadie confunda "no
diseñado para esto" con "está roto".

## Modelo de datos

Sin cambios. No hay migración, no hay campo nuevo, `MENU_SCHEMA_VERSION` sigue
en 1. Los menús ya publicados siguen renderizando igual.

## Restricciones del compilador de React

El editor actual lleva comentarios explicando que expresiones condicionales,
`??`, `?.` y operadores lógicos dentro de un `try/catch` sacan al componente
entero de la compilación del React Compiler sin emitir ningún aviso en el build.
El código nuevo respeta esa restricción: dentro de los `try` solo llamadas y
asignaciones planas, y el parseo de respuestas en funciones puras aparte.

## Pruebas automatizadas

Vitest, entorno node, sin navegador.

- `menuBlockList`: mover entre extremos, el límite de uno por tipo, no duplicar
  una categoría, quitar, alternar visibilidad, y la lista de disponibles.
- `groupProductsBySize`: el agrupado que hoy no tiene ninguna prueba, incluido
  el caso de un producto cuyo tamaño no resuelve en el ajuste.
- `createAutosave` con relojes falsos: que el debounce colapsa varios cambios en
  un guardado, que nunca hay dos en vuelo, que la cola guarda solo el último, y
  que un fallo detiene la cadena hasta el reintento.

## Verificación manual

Requiere sesión de dueño; nada de esto se puede automatizar en este trabajo.

1. Arrastrar una categoría de la última posición a la primera; la previa se
   reordena sin recargar.
2. Ocultar un bloque; se atenúa en la lista y desaparece de la previa.
3. Quitar una categoría; vuelve a aparecer en el menú "Agregar".
4. Agregar portada cuando ya existe una: la opción está deshabilitada.
5. Editar el título de la portada; la previa lo refleja al tipear.
6. Esperar sin tocar nada: el indicador pasa a "Guardado". Recargar y comprobar
   que el orden se conservó.
7. Arrastrar varias veces rápido y recargar: el orden guardado es el último que
   se ve en pantalla.
8. Cortar la red y mover un bloque: aparece el aviso de error con "reintentar",
   y el reintento con la red de vuelta guarda.
9. Cerrar la pestaña con un cambio recién hecho: el navegador advierte.
10. Botón celular: la previa se angosta a 390 px.
11. Publicar; abrir `/m/<slug>` en ventana privada y comprobar que el orden
    coincide con el del editor.
12. Cambiar el enlace desde su sección; el enlace viejo deja de servir el menú y
    el nuevo lo sirve.
13. Achicar la ventana por debajo del corte: aparece el aviso de pantalla angosta.

## Decisiones descartadas

**Arrastrar directamente sobre la vista previa.** Imposible con `iframe`:
`@dnd-kit` no cruza el borde entre documentos, así que un bloque agarrado en el
panel deja de existir para el arrastre apenas entra al `iframe`.

**Recargar el `iframe` después de cada autoguardado, sin `postMessage`.** Más
simple y con fidelidad total (sería el mismo Server Component que la página
pública), pero con parpadeo de recarga cada 1,5 s y un viaje al servidor por
arrastre. Queda registrada como salida de emergencia si el `postMessage` resulta
más caro de lo previsto al implementarlo.

**Paleta lateral de categorías disponibles.** Tres columnas obligan a pantalla
ancha sí o sí y a diseñar un modo angosto aparte. El botón "Agregar" cubre el
mismo caso con menos superficie.

## Riesgos

- **`postMessage` sin validar origen.** Es la falla clásica de este patrón y va
  escrita como requisito de implementación, no como comentario.
- **Carrera al montar el `iframe`.** Mitigada con el `ready` y el reenvío en
  `load`.
- **Pérdida de escrituras por concurrencia en el autoguardado.** Mitigada con la
  cola de uno; es lo que las pruebas de `createAutosave` existen para cubrir.
- **La mudanza de `menu-blocks.jsx` toca la página pública.** El menú público ya
  está en producción: la verificación tiene que incluir abrirlo y comprobar que
  renderiza igual que antes de la mudanza.

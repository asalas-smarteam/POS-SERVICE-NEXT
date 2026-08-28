# Menú en línea 1b‑2 — presentación

Sub-proyecto 1b‑2 del módulo de menú en línea. Los otros tres del corte están en
`2026-08-21-online-menu-roadmap.md`: 1b‑1 Lienzo (hecho,
`2026-08-22-online-menu-canvas-design.md`), 1b‑3 Tema y 1b‑4 Clonado.

## Objetivo

Que el dueño elija cómo se presenta cada bloque de categoría, en vez de recibir
una sola presentación decidida por el flag `hasSizes` de la categoría.

De los cuatro menús de pizzería que aportó el dueño salieron tres patrones de
mostrar tamaños, más un uso de doble columna en pantalla angosta. Este
sub-proyecto los implementa y resuelve la pregunta que el roadmap dejó
explícitamente abierta: qué hace el patrón de tabla única cuando los precios por
tamaño no son uniformes.

## Alcance

Entra:

- Cuatro variantes de presentación para el bloque de categoría, elegibles por
  bloque, solo en categorías con tamaños.
- Doble columna, elegible por bloque, en categorías con y sin tamaños.
- La regla de precios no uniformes para la variante de tabla única.
- Mover la carga de datos de la vista previa del iframe al editor, que es lo que
  permite avisar del caso de caída sin duplicar la regla.

No entra:

- Variantes de presentación para categorías **sin** tamaños. Siguen con la lista
  plana de hoy. Solo ganan la doble columna.
- Tema global: logo, colores, tipografía. Es 1b‑3.
- La asimetría del techo de 500 productos entre la previa y el menú público. El
  spec de 1b‑1 la difirió nombrando a 1b‑2 como su lugar; se difiere otra vez.
  A escala de decenas de productos el techo no se toca nunca y el cartel de la
  previa ya describe con honestidad lo que recorta. Se reevalúa cuando un
  catálogo real se acerque a 500.

## Punto de partida

Lo que ya existe y este sub-proyecto no cambia:

- `MenuBlockList` en `src/app/components/menu/menu-blocks.jsx` es el único
  despacho bloque → componente, y lo importan tanto la página pública
  (`src/app/m/[slug]/page.jsx`) como la previa del editor. Filtra con
  `renderableBlocks` adentro.
- El bloque de categoría ya tiene dos campos presentacionales, `showPhotos` y
  `showDescriptions`, normalizados en `normalizeBlock` de `lib/menu/menuSchema.js`.
- El editor tiene un panel expandible por bloque (`CategoryFields` en
  `block-row.jsx`) y un slot de aviso por fila que hoy usa la categoría inactiva.
- La previa es un iframe de ancho real con un botón de 390 px, así que el dueño
  ve el resultado de celular antes de publicar.

Y lo que hay que saber del modelo de datos:

- Los tamaños son **una lista global del tenant** (ajuste `Product Sizes`:
  Pequeño / Mediano / Grande). Cada categoría se apunta con `hasSizes`; no tiene
  su propia lista.
- **Cada tamaño de un plato es un `Product` con su propio precio**, ligado por
  `productSizeId`. No existe un id de "plato" que una a sus variantes: lo único
  que las une es el nombre recortado, que es lo que hace `groupProductsBySize`.
  De ahí sale el problema de la tabla única.

## Catálogo de variantes

Solo para categorías con `hasSizes`.

| id | Nombre | Cómo se ve |
|---|---|---|
| `sizeRows` | Filas por tamaño | El plato, y debajo una fila `Mediano … ₡5.500` por tamaño. **Es lo que se renderiza hoy, y es el default.** |
| `priceColumns` | Columnas de precio | Encabezado con los tamaños; cada plato en una fila con sus precios alineados en columnas. |
| `sizeTable` | Tabla única | Tabla de tamaños y precios arriba, una vez para toda la categoría; los platos van con nombre e ingredientes. |
| `sizeBadges` | Badges por ítem | Tarjeta con foto y descripción; un chip por tamaño con su precio debajo. |

Una categoría sin `hasSizes` no muestra el selector y sigue con la lista plana.
El campo `variant` igual se guarda y se normaliza: `hasSizes` se puede encender
en Ajustes después de que el menú está publicado, y en ese momento la elección
guardada tiene que valer.

## Modelo de datos

Dos campos nuevos en `data` del bloque de categoría, normalizados en
`normalizeBlock` junto a `showPhotos` y `showDescriptions`:

- `variant`: uno de los cuatro ids. Un valor desconocido, ausente o de otro tipo
  cae a `sizeRows`.
- `columns`: `1` o `2`. Cualquier otro valor cae a `1`.

**`MENU_SCHEMA_VERSION` se queda en 1.** No hay migración porque los defaults
reproducen exactamente el render actual: un menú publicado antes de esta rama
sale byte por byte igual sin que nadie lo toque. Subir la versión sin migración
que la acompañe gastaría el único punto de apoyo que el esquema tiene reservado
para cuando haya un cambio que sí rompa (ver el comentario de
`resolveStoredVersion`).

`columns` no aplica a `priceColumns`: esa variante existe para alinear precios a
lo ancho de la sección y partirla en dos la rompe. El editor esconde el control
en vez de ofrecerlo e ignorarlo. En `sizeTable` sí aplica, y es donde más rinde:
la tabla queda a todo el ancho y la lista de platos va abajo en dos columnas.

## La regla de precios no uniformes

El patrón de tabla única asume que todos los platos de la categoría cuestan lo
mismo en cada tamaño. El modelo no lo garantiza.

**La restricción que manda sobre todo lo demás: ninguna variante puede mostrarle
a un cliente un precio que su plato no tiene.** Es un menú público servido por QR
a gente sin sesión; alguien lee ₡5.000, pide, y le cobran ₡6.500. Eso descarta
derivar la tabla e ignorar las diferencias, y es la razón por la que las tres
ramas de la regla terminan mostrando precios exactos.

Vive en un módulo puro, `src/app/lib/menu/sizePriceTable.js`, y la usan la previa
y el menú público a través del mismo `MenuBlockList`. Una sola implementación,
por el mismo motivo por el que `canPublish` reusa `renderableBlocks`: dos listas
de condiciones que hoy coinciden son dos listas que mañana divergen.

```
buildSizePriceTable(dishes, sizeOrderMap) -> {
  sizes,       // [{ sizeId, label, price }] en el orden del ajuste; la tabla
  rows,        // platos que calzan: [{ id, name, description, image }]
  exceptions,  // [{ id, name, description, image, sizes: [{ sizeId, label, price }] }]
  fellBack,    // boolean
}
```

1. El universo de tamaños son los `sizeId` que **resuelven** en `sizeOrderMap`,
   en el orden del ajuste. Un producto cuyo tamaño fue borrado o desactivado no
   tiene identidad de tamaño y no puede participar de una tabla.
2. Un tamaño entra en la tabla solo si **al menos la mitad de los platos lo
   tienen**, y su precio es el **más frecuente** entre esos platos. Si hay
   empate en el precio más frecuente, el tamaño no entra.

   El guard de mayoría no es cosmético. Sin él, un tamaño que existe en un solo
   plato —una "Jumbo" que solo tiene la Especial— entra en la tabla con el precio
   de ese plato, porque con un solo dato no hay empate posible. A partir de ahí
   los otros diez platos son excepción por *faltarles* ese tamaño, las
   excepciones son mayoría, y la regla 5 tumba la tabla en un menú que no tenía
   nada de raro. Con el guard, la Jumbo queda fuera de la tabla y el único plato
   que la tiene es la única excepción, que es la respuesta correcta.
3. Un plato **calza** si tiene exactamente los tamaños de la tabla, todos al
   precio de la tabla, y ningún tamaño sin resolver.
4. Todo lo demás es **excepción**, y lleva sus propios precios en su renglón, con
   el mismo formato que usa `priceColumns`.
5. Si la tabla quedó sin tamaños, o si las excepciones superan a los platos que
   calzan, `fellBack` es `true` y el bloque se renderiza como `priceColumns`.

La regla 5 es la que evita el peor resultado: una tabla con un precio arriba y
doce renglones contradiciéndola. Una tabla cuyas excepciones son mayoría no está
comunicando nada, y `priceColumns` siempre muestra el precio exacto de cada
plato.

**`groupProductsBySize` tiene que emitir también el `sizeId`.** Hoy su salida
lleva `{ id, label, price }` donde `id` es el id del *producto*: la identidad del
tamaño se pierde en el camino, y sin ella no se puede agrupar por tamaño para
armar la tabla. Es un campo agregado, no un cambio de contrato: el renderizador
actual sigue leyendo lo mismo y sus siete pruebas siguen valiendo.

## Doble columna

`grid-cols-2` desde 390 px, sin breakpoint intermedio. Los menús de referencia
que la usan son papel angosto y alto, que es la misma proporción que un celular;
poner la doble columna solo desde tablet la volvería invisible para la mayoría de
los visitantes, que llegan escaneando un QR.

Con `showPhotos` encendido y `columns: 2`, la foto baja de 80 a 56 px. No se
apaga la foto ni se ignora la elección: el dueño ve el resultado real en la previa
de 390 px antes de publicar, y en categorías de bebidas o postres la combinación
funciona.

Se usa `grid` y no `columns` de CSS: multi-columna reparte el contenido por altura
y parte una tarjeta entre dos columnas, que es exactamente lo que no se quiere en
una lista de platos.

## Arquitectura: el fetch sube al editor

Hoy `preview/page.jsx` pide sus propios datos a `preview-data` y el editor solo le
manda la lista de bloques por `postMessage`. Eso deja al editor sin los precios, y
sin los precios no puede avisar cuando la regla 5 hizo caer la tabla — el caso en
que el selector dice "Tabla única" y la previa muestra columnas.

Calcularlo en el servidor sería una segunda implementación de la regla. Este
módulo ya se llevó dos sustos por tener dos lugares decidiendo lo mismo (la
publicación que decía "éxito" hacia un 404, y la previa que podía divergir del
renderizador), así que no se hace.

**El editor hace el fetch y manda los datos por el mismo `postMessage` que ya
manda los bloques. El iframe queda como renderizador puro.**

Lo que mejora además del aviso:

- El editor calcula el aviso con **el mismo módulo puro** que usa el
  renderizador. Divergencia imposible por construcción.
- La previa pierde su estado de error propio. Hoy hay dos caminos de fallo con
  dos mensajes; queda el banner con reintento que 1b‑1 ya tiene en el editor.
- `preview/page.jsx` se queda sin su `useEffect` de carga, sin `readPreviewData`
  y sin `failed`.

Lo que cuesta: la primera pintura de la previa espera al fetch del padre en vez de
ir en paralelo. La previa hoy muestra blanco mientras carga —deuda que 1b‑1 ya
registró— y va a seguir mostrándolo. No se arregla ni se empeora acá.

El handshake no cambia de forma: la previa sigue avisando `READY` después de
registrar su listener, y el padre sigue respondiendo con un mensaje. Solo crece la
carga útil, que pasa a llevar `categories`, `products`, `sizes`, `currency` y
`truncated` junto a `blocks`. La validación de origen en las dos direcciones se
mantiene igual, y sigue sin usarse `'*'` en ningún lado.

## Interfaz del editor

Dentro de `CategoryFields`, debajo de los dos checkboxes actuales:

- Un select **Presentación** con las cuatro variantes. Se renderiza solo si la
  categoría del bloque tiene `hasSizes`.
- Un checkbox **Dos columnas**. Se esconde cuando la variante es `priceColumns`.
- El aviso de la regla 5 va en el slot `warning` que `BlockRow` ya tiene: dice que
  los precios de la categoría no son uniformes y que por eso el bloque se está
  mostrando por columnas.

`/menu/categories` pasa a devolver `hasSizes` por categoría. Es lo que le permite
a la fila saber qué ofrecer. `preview-data` ya lo devuelve, así que las dos
lecturas quedan alineadas.

## Archivos

**Módulos puros nuevos:**

- `src/app/lib/menu/menuVariants.js` — el catálogo, `DEFAULT_VARIANT`,
  `normalizeVariant`, `variantsForCategory(hasSizes)`, `supportsColumns(variant)`.
- `src/app/lib/menu/sizePriceTable.js` — `buildSizePriceTable`.

**`menu-blocks.jsx` se parte.** Hoy tiene 180 líneas; con cuatro renderizadores
más pasaría de 400 haciendo dos cosas distintas. Queda `menu-blocks.jsx` con
`HeroBlock`, `FooterBlock` y el despacho `MenuBlockList`, y sale
`category-blocks.jsx` con los cinco renderizadores de categoría (la lista plana
más las cuatro variantes). `MenuBlockList` se sigue exportando del mismo lugar:
ni la página pública ni la previa cambian sus imports.

**Modificados:** `menuSchema.js` (los dos campos), `groupProductsBySize.js` (el
`sizeId`), `block-row.jsx` (los dos controles), `page.jsx` del editor (el fetch),
`preview-panel.jsx` y `preview/page.jsx` (la carga útil), la ruta
`/menu/categories`, y `messages/es.json` + `messages/en.json`.

## Pruebas automatizadas

`sizePriceTable`: precios uniformes, una excepción, empate en el precio más
frecuente, mayoría de excepciones → `fellBack`, plato al que le falta un tamaño de
la tabla, plato con un tamaño que no resuelve en el ajuste, categoría de un solo
plato, lista vacía. Y el caso del guard de mayoría, que es el que se escapa solo:
diez platos con tres tamaños más uno que agrega un cuarto tamaño propio tiene que
dar tabla de tres tamaños con una excepción, **no** `fellBack`.

`menuVariants`: valor desconocido → default, ausente → default, catálogo según
`hasSizes`, `supportsColumns` por variante.

`menuSchema`: un bloque sin `variant` ni `columns` normaliza a los defaults de
hoy; `columns` fuera de `1|2` se corrige; un menú publicado antes de 1b‑2
sobrevive el round-trip de `normalizeMenuDocument` sin cambiar un solo campo.

`groupProductsBySize`: las siete pruebas actuales siguen pasando, más una que
verifica el `sizeId` agregado.

Los componentes siguen sin pruebas automatizadas: el repo corre Vitest en
`environment: "node"`, sin jsdom ni testing-library. Se verifican por inspección,
lint, compilador de React y build, más la checklist de abajo. Montar un entorno de
DOM es un trabajo propio, no un arreglo de este sub-proyecto.

## Verificación manual

Todos requieren sesión de dueño, así que ninguno se puede automatizar.

1. Abrir un menú publicado **antes** de esta rama y comprobar que renderiza
   idéntico. Es el punto más importante: los defaults son toda la garantía de
   compatibilidad.
2. En una categoría con tamaños, recorrer las cuatro variantes y ver que la previa
   cambia en vivo, sin recargar.
3. Publicar con una variante distinta de `sizeRows` y comprobar que `/m/<slug>`
   muestra lo mismo que la previa.
4. Con precios uniformes, elegir `sizeTable` y ver la tabla arriba y los platos sin
   precio.
5. Cambiarle el precio a un solo plato en un solo tamaño y ver que ese plato pasa a
   llevar sus precios en su renglón, con la tabla intacta.
6. Hacer que la mayoría de los platos difiera y ver que el bloque cae a
   `priceColumns` y que la fila del editor muestra el aviso.
7. Desactivar un tamaño en Ajustes y ver que los platos que lo usaban pasan a
   excepción sin desaparecer.
8. Encender **Dos columnas** en una categoría sin tamaños y verla en el botón de
   390 px.
9. Encender **Dos columnas** con fotos y comprobar que la foto baja a 56 px y que
   los nombres no se cortan.
10. Elegir `priceColumns` y comprobar que el checkbox de columnas desaparece, y que
    volver a otra variante lo devuelve con su valor guardado.
11. Cortar la red y recargar el editor: el banner con reintento aparece una sola
    vez, no dos, y la previa no muestra su propio mensaje de error.
12. Con el editor abierto en dos pestañas, cambiar la variante en una y comprobar
    que la otra no la pisa antes de su propio autoguardado (limitación conocida de
    1b‑1, se verifica para confirmar que no empeoró).
13. Encender `hasSizes` en Ajustes para una categoría que ya era bloque y comprobar
    que aparece el selector con la variante guardada.

## Decisiones descartadas

**Mostrar un rango en la tabla** (`Grande ₡8.000–₡10.000`). Honesto pero inútil:
el cliente no puede saber cuánto cuesta lo suyo, y el renglón del plato sigue
necesitando su precio igual. No elimina ningún trabajo y empeora la lectura.

**Deshabilitar `sizeTable` cuando los precios no son uniformes.** Simple y seguro,
pero un solo plato distinto bloquea el diseño que el dueño quiere, y el camino de
salida que le queda es cambiar precios reales para conformar al editor.

**Calcular la uniformidad en el servidor** y devolverla con las categorías.
Duplicaría la regla en dos lugares. Es la clase de divergencia que este módulo ya
pagó dos veces.

**La doble columna como ajuste global en 1b‑3.** Fuerza el mismo tratamiento a
bebidas y a pizzas. 1b‑3 es marca —logo, colores, tipografía—, no densidad de
layout.

**Variantes para categorías sin tamaños.** Descartado por alcance, no por mala
idea: la lista plana con foto cubre el caso, y agregar tarjetas grandes o lista
compacta duplicaría el catálogo sin que ningún menú de referencia lo pida.

## Riesgos

**El fetch que sube al editor toca el handshake de 1b‑1.** Es código que costó
tres rondas de revisión. La forma del handshake no cambia y la validación de
origen se mantiene, pero es el punto de la rama con más superficie de regresión, y
los puntos 11 y 12 de la checklist existen por eso.

**El nombre recortado sigue siendo la única clave de agrupación.** Dos platos
distintos que compartan nombre se fusionan, ahora también dentro de la tabla. Es
una limitación heredada del modelo, documentada en `groupProductsBySize`, y este
sub-proyecto no la arregla: hacerlo pide un concepto de "plato" que agrupe sus
variantes de tamaño, que es un cambio de esquema con migración.

**`fellBack` es una caída silenciosa en el menú público.** El editor avisa, pero
un menú publicado cuya categoría se vuelve no uniforme después cambia de
presentación sin que nadie se entere. Es el mismo patrón que el 404 por categoría
desactivada que 1b‑1 dejó registrado, y comparte solución: un chequeo de fondo
sobre los menús publicados contra los ajustes vigentes.

# Motor del menú en línea

Fecha: 2026-08-22
Estado: aprobado
Padre: `2026-08-21-online-menu-roadmap.md` (sub-proyecto 1a)

## Objetivo

Que el dueño de una cuenta pueda armar el menú público de una sede y obtener un
link para compartir o imprimir en un QR. Al terminar, el módulo ya es vendible:
hay menús públicos funcionando. El editor visual con drag & drop es el
sub-proyecto 1b.

Este es el primer módulo del proyecto con una ruta pública sin sesión, y el
primero cuyo administrador es el dueño de la cuenta y no un usuario de sede.

## Alcance

Tres tipos de bloque: portada, sección de categoría y pie. Un slug por sede,
elegido por el dueño. Un formulario mínimo en el panel del dueño para editar y
publicar. La página pública, cacheada.

Explícitamente fuera:

- Drag & drop, variantes de diseño por bloque, tema global (logo, colores,
  tipografía), vista previa en vivo y clonado entre sedes. Todo eso es 1b.
- **Logo e imagen de fondo en la portada.** El bloque `hero` de 1a es solo texto:
  título y subtítulo. Poner un logo requeriría subida de archivos a nivel de
  sede, y lo que existe hoy es específico de productos
  (`/api/products/[id]/image`, con la clave del blob construida a partir de un
  `productId`). Esa subida es scope propio, y el logo ya está listado dentro del
  tema global de 1b, así que va junto con él.
- Más tipos de bloque: galería, mapa, promociones, redes. Eso es el
  sub-proyecto 2.
- QR imprimible y analítica de visitas. Sub-proyecto 3.
- Pedidos, carrito, pagos. Sub-proyecto 4.
- Subdominio o dominio propio. Sub-proyecto 5.
- Menú multi-idioma. `Product.name` es un solo string; traducir el catálogo es
  un cambio de modelo de datos propio.
- Alias de slugs viejos.
- Visibilidad por producto.

## Resolución del link

`Tenant.menuSlug` en el master DB, con índice **único disperso** (`unique` +
`sparse`, para que las sedes sin menú no colisionen entre sí en `null`).

Es el único lugar donde puede vivir: resolver `/m/<slug>` → sede tiene que pasar
antes de saber a qué base de datos conectarse, y el master es la única base que
se conoce sin ese dato.

### Reglas del slug

| Regla | Valor |
|---|---|
| Caracteres | `a-z`, `0-9` y guion |
| Largo | 3 a 40 |
| Forma | No empieza ni termina en guion, sin guiones dobles |
| Almacenamiento | Siempre en minúsculas; se normaliza al guardar |
| Unicidad | Global. Un slug tomado responde 409 con un mensaje que lo dice. |

Lo **elige el dueño**, no se autogenera: es parte del producto que el link se
lea bien. `/m/pizzeria-luigi` sirve para imprimir; `/m/t-48291` no.

Es **editable**, y el formulario advierte que cambiarlo rompe los QR ya
impresos. No se guardan alias de los slugs anteriores: es un array más y lógica
de redirección para un caso que en v1 se resuelve no cambiando el slug.

Al cambiar el slug hay que revalidar **las dos** rutas, la vieja y la nueva. Si
solo se revalida la nueva, la vieja queda sirviendo el menú desde la caché.

## Esquema de bloques

Un `TenantSetting` con `description: 'Online Menu'` en la base de la sede, igual
que el resto de la configuración del tenant.

```js
{
  version: 1,
  draft: {
    blocks: [
      { id, type: 'hero',     visible, data: { title, subtitle } },
      { id, type: 'category', visible, data: { categoryId, showPhotos, showDescriptions } },
      { id, type: 'footer',   visible, data: { text, phone, address } },
    ],
  },
  published: null,   // la misma forma que `draft`, o null si nunca se publicó
  publishedAt: null,
}
```

`version` existe para poder migrar menús ya publicados sin romperlos. Es lo
único que no se puede agregar después.

### Un bloque por categoría

Un bloque `category` referencia **una** categoría, no una lista. Es la decisión
estructural del esquema: hace que el orden de los bloques *sea* el orden del
menú, y en 1b arrastrar bloques reordena las categorías sin ninguna lógica
adicional.

### El menú es una whitelist, no un espejo

Una categoría solo aparece en el menú si tiene su bloque. Una categoría nueva no
se suma sola.

Es deliberado: evita que una categoría interna —"Consumo de personal"— se filtre
al menú público el día que alguien la crea. La contracara es que hay que
acordarse de agregar las categorías nuevas, y el formulario lo hace visible
listando las categorías activas que todavía no tienen bloque.

### Los bloques referencian, nunca copian

`data.categoryId` es un id, y los productos se resuelven en cada render. La
configuración guarda estructura y estilo; nombres y precios salen siempre de
`Product`. Un bloque que guardara una copia produciría menús mostrando precios
viejos.

## Borrador y publicado

Las dos versiones viven en el mismo documento. Una sola escritura atómica, sin
colección nueva, sin posibilidad de que queden desincronizadas.

Publicar copia `draft` a `published`, sella `publishedAt` y revalida la ruta
pública. La página pública lee **solo** `published`: un borrador a medio armar no
es visible para nadie.

## La ruta pública

`src/app/m/[slug]/page.jsx` — Server Component, **fuera de `[locale]`**, con
`export const revalidate = 60`.

### Por qué fuera de `[locale]`

El middleware de `next-intl` corre sobre todo lo que el matcher no excluye, y con
el `localePrefix` por defecto redirige `/m/pizzeria` a `/es/m/pizzeria`. Un
locale en el medio de un link que se imprime en un QR no tiene sentido, y el
menú no necesita el i18n de la app: su contenido son los nombres de los
productos del tenant, no strings de interfaz.

Por eso `m` se suma al lookahead negativo del `matcher` del middleware.
**Marcarla como pública en `routeDefinitions` no alcanza**: `intlMiddleware(request)`
se ejecuta en la primera línea del middleware, antes del chequeo de ruta pública.

### Flujo

1. Resolver `Tenant` por `menuSlug` en el master DB.
2. Verificar `status === 'active'`.
3. **Verificar que la cuenta tenga el feature `online-menu` contratado**, leyendo
   `Tenant.features`.
4. Abrir la conexión a la base de la sede.
5. Leer el `TenantSetting` del menú y tomar `published`.
6. Leer el `TenantSetting` de categorías (`description: 'Product Category'`, el
   mismo que ya consume `lib/tenant/categorySettings.js`) y, en **una sola
   consulta**, los productos de todos los `categoryId` referenciados por bloques
   visibles.
7. Renderizar los bloques en el orden del array.

El paso 3 es comercial, no técnico: **si el cliente deja de pagar el módulo, el
menú deja de servirse.** Sin ese chequeo, un menú publicado seguiría vivo para
siempre y el módulo no sería realmente vendible.

El paso 6 en una sola consulta y no una por bloque: un menú con ocho categorías
no debe costar ocho viajes a la base.

### Caché

`revalidate = 60`, más revalidación explícita al publicar.

Los precios cambian en el módulo de productos, no al publicar el menú, así que
una estrategia basada solo en revalidar-al-publicar dejaría precios viejos
indefinidamente. El TTL de 60 segundos es lo que cubre ese caso sin acoplar el
módulo de productos al del menú.

El beneficio real es de ráfagas: una mesa de doce personas escaneando el QR a la
vez recibe el mismo HTML cacheado, sin consultas a Mongo. Eso importa en Vercel,
donde cada función fría abre su propia conexión a Atlas y hay un límite.

El costo aceptado: un cambio de precio hecho en el POS tarda hasta un minuto en
verse en el menú.

### Render

- **Precios**: `formatCurrencyAmount` con la moneda del `TenantSetting` de
  ajustes de la sede, y `defaultLocale` como locale de formato, porque en v1 el
  menú es de un solo idioma.
- **Fotos**: `Product.image` si existe. Un producto sin foto se muestra solo con
  texto; no hay imagen de relleno.
- **Categoría ausente o inactiva**: su bloque se omite al renderizar. Desactivar
  una categoría en ajustes la saca del menú sin tener que editar el menú.
- **Variantes de tamaño**: los productos se listan planos, sin etiqueta de tamaño.
  Un plato con variantes aparece como varios ítems, distinguidos por su nombre.
  Renderizar la etiqueta exigiría leer el ajuste de tamaños de producto, y el repo
  viene de un refactor que quitó esa funcionalidad, así que el campo quedaría
  colgado.
- **Bloque con `visible: false`**: no se renderiza ni se consultan sus productos.

## El módulo en el registro de features

`online-menu` entra en `FEATURE_DEFINITIONS`, con su fila en `FeaturePrice` y sus
textos en el namespace `Plans` de `messages/es.json` y `messages/en.json`.

Pero `PROTECTED_MODULES` (en `routeDefinitions.js`) y `ROLE_PERMISSIONS.admin`
(en `rolePermissions.js`) se derivan de `ALL_FEATURE_KEYS`, y este módulo **no es
una ruta de sede**. Derivar de él protegería una ruta inexistente y lo ofrecería
a un rol de sede que no puede usarlo.

Solución: una marca `companyScoped: true` en su definición, y excluir las
features marcadas así de esas dos derivaciones. `SELECTABLE_FEATURE_KEYS` las
sigue incluyendo, porque son vendibles. El registro ya está diseñado para este
tipo de marca: `alwaysOn` y `requiredForCustom` funcionan igual.

Esto también cierra el riesgo anotado en el roadmap sobre `resolveFallbackModule`
pudiendo redirigir a una ruta que no existe.

## El editor mínimo

`/[locale]/admin/[companyId]/menu/[tenantId]`, con un botón "Menú" en cada fila
de sede del panel del dueño. `resolveAdminPanelFromPath` solo mira los segmentos
`admin/{companyId}`, así que la ruta ya queda protegida owner-only sin tocar el
middleware.

Un formulario, sin drag & drop y sin vista previa en vivo:

- Campo de slug, con la advertencia sobre los QR impresos.
- Campos de los bloques `hero` (título, subtítulo) y `footer` (texto, teléfono,
  dirección).
- Lista de categorías activas con un checkbox para incluirla y un número para su
  orden.
- Botones "Guardar borrador" y "Publicar", y el link a la página pública.

El orden del array de bloques es siempre la autoridad al renderizar. El
formulario de 1a solo permite reordenar los bloques de categoría, y al guardar
escribe el array con `hero` primero y `footer` último. El renderizador no asume
esa posición: si un menú llega con otro orden, lo respeta.

### API

Company-scoped, siguiendo el precedente de
`src/app/api/company/sedes/[tenantId]/users/route.js`: `getOwnerContext(req)`
para el `companyId` del token, y después verificar que la sede pertenezca a esa
empresa (`Tenant.findOne({ tenantId, companyId, status: 'active' })`), con 403 si
no. El token del dueño no lleva `tenantId`, así que la pertenencia se verifica
siempre contra el master, nunca contra un dato del cliente.

```
GET   /api/company/sedes/[tenantId]/menu     lee slug + draft + published
PUT   /api/company/sedes/[tenantId]/menu     guarda slug + draft
POST  /api/company/sedes/[tenantId]/menu/publish      copia draft a published y revalida
GET   /api/company/sedes/[tenantId]/menu/categories   categorias activas de la sede
```

El endpoint de categorias existe porque el editor vive en el panel del dueño, que no
tiene sesion de sede y por lo tanto no puede reusar `/api/settings`.

Los cuatro validan que la cuenta tenga el feature `online-menu`, con la misma
lógica que usa la página pública. Un dueño que no compró el módulo no puede
editarlo.

Errores: 400 esquema o slug inválidos, 403 sede ajena o feature no contratado,
409 slug tomado. Los mensajes se enmascaran cuando el status cae a 500,
siguiendo el patrón de las rutas de `company/`.

## Errores de la página pública

Slug desconocido, sede inactiva, feature no contratado y menú nunca publicado:
los cuatro responden **404** vía `notFound()`.

Un 404 es mejor que una página vacía: comunica "acá no hay nada" en vez de "este
local no tiene comida". Y no distingue entre los cuatro casos, así que el link no
sirve para averiguar qué sedes existen ni quién dejó de pagar.

Un fallo de base de datos sube al error boundary y da 500.

## Pruebas

Vitest sobre lógica pura, siguiendo lo establecido en el sub-proyecto 0:

- Validación y normalización del esquema de bloques: descarta tipos desconocidos,
  rellena defaults, conserva el orden, rechaza un bloque sin `categoryId`.
- Validación del slug: acepta los válidos, rechaza mayúsculas, guiones al borde,
  guiones dobles, menos de 3 y más de 40 caracteres, y normaliza a minúsculas.
- La transición borrador→publicado: `published` queda igual a `draft`,
  `publishedAt` se sella, y un `draft` vacío no puede publicarse.
- El filtro de bloques renderizables: omite los invisibles y los que apuntan a
  una categoría ausente o inactiva.

Sin tests de rutas ni de la página pública: requieren mockear las conexiones por
tenant, que es un trabajo comparable al del sub-proyecto entero. Es la misma
deuda consciente que se asumió en el sub-proyecto 0.

## Riesgos y deuda

- **Cambiar el slug rompe los QR impresos.** Mitigado con una advertencia en el
  formulario, no con alias. Si en la práctica pasa seguido, los alias son la
  respuesta.
- **Una categoría nueva no aparece sola en el menú.** Consecuencia directa de la
  whitelist. El formulario lista las categorías activas sin bloque para que se
  note.
- **Sin visibilidad por producto.** Un producto que no debe ser público tiene que
  vivir en una categoría que no se publica.
- **Las fotos se sirven públicamente sin autenticación**, como ya se anotó en el
  spec del sub-proyecto 0. Con el menú público eso pasa de ser una propiedad
  teórica a ser el funcionamiento normal del módulo.
- **`revalidate = 60` es un número elegido, no medido.** Si el tráfico o las
  quejas por precios desactualizados dicen otra cosa, es una constante.
- **Sin límite de tamaño del menú.** Un menú con cincuenta bloques de categoría
  es una consulta grande y una página enorme. No se acota en v1.

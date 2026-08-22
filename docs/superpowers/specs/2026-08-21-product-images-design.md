# Fotos y descripciones de producto

Fecha: 2026-08-21
Estado: aprobado
Padre: `2026-08-21-online-menu-roadmap.md` (sub-proyecto 0)

## Objetivo

Que un producto pueda tener una foto y una descripción. Es el prerrequisito del
módulo de menú en línea, que sin imágenes se vende bastante peor, pero el trabajo
sirve al POS entero: hoy las tarjetas de producto de `/orders` y `/products`
muestran un ícono genérico de café.

No es un módulo vendible. Es una mejora del módulo `products`, que es
`requiredForCustom` y por lo tanto está en todas las cuentas.

## Alcance

Una imagen por producto y una descripción de texto. Nada más.

Explícitamente fuera:

- Galería o múltiples imágenes por producto.
- UI de recorte o encuadre. La imagen se recorta con `object-cover` a un aspecto
  fijo en cada lugar donde se muestra. Si un plato queda mal encuadrado, la
  solución es subir otra foto.
- Redimensionado en el servidor.
- Cuota de almacenamiento por cuenta.
- Imágenes en categorías, ingredientes o cualquier otra entidad.

## Modelo de datos

En `src/app/models/tenant/Product.js`:

```js
description: { type: String, default: '', trim: true, maxlength: 300 },
image: {
  url: String,       // URL pública servible
  pathname: String,  // clave en el backend de almacenamiento
  width: Number,     // para reservar el aspect-ratio en next/image
  height: Number,
},
```

Ambos campos son opcionales y **no hace falta migración**: los productos
existentes siguen funcionando con el ícono actual.

`pathname` es lo que hace posible borrar de verdad. Guardando solo la URL, cada
reemplazo de foto dejaría un archivo huérfano ocupando almacenamiento para
siempre. Se guardan las dimensiones porque `next/image` las necesita para
reservar espacio y evitar que el layout salte al cargar.

## Adaptador de almacenamiento

Un solo lugar del código sabe cómo se guardan archivos. El resto del módulo
—validación, endpoints, UI, ciclo de vida— no sabe qué driver está activo.

`src/app/lib/storage/index.js`:

```js
// Elige driver según STORAGE_DRIVER. Default: 'local'.
export function getStorage()
```

Contrato que cumple todo driver:

```js
put(buffer, { key, contentType })  →  { url, pathname }
remove(image)                      →  void   // recibe { url, pathname }
```

`remove` recibe el objeto guardado completo, no solo el `pathname`, para que cada
driver use el identificador que su backend necesita sin que el llamador tenga que
saber cuál es.

### Driver `local` — desarrollo

La clave se cuelga de `public/uploads/`, y la URL es esa misma clave con el
prefijo `/uploads/`. Para la clave
`tenants/t123/products/650f…-a1b2c3d4.jpg`, el archivo va a
`public/uploads/tenants/t123/products/650f…-a1b2c3d4.jpg` y la URL guardada es
`/uploads/tenants/t123/products/650f…-a1b2c3d4.jpg`.

Next en desarrollo sirve `public/` leyendo del disco en cada request, así que no
requiere ruta adicional. Al ser relativa, la URL tampoco requiere
`remotePatterns`.

Funciona sin credenciales, sin cuenta y sin red: es el driver con el que se
desarrolla y con el que corren los tests.

Detalles de implementación: crear directorios con `mkdir` recursivo, y construir
rutas siempre con `path.join`, nunca concatenando strings, porque el desarrollo es
en Windows y el deploy en Linux.

Se agrega `/public/uploads` a `.gitignore`.

Limitación aceptada: los archivos no se borran del disco si se resetea la base de
datos a mano. Irrelevante en desarrollo.

### Driver `vercel-blob` — producción

Usa `@vercel/blob` con `BLOB_READ_WRITE_TOKEN`. Elegido porque el proyecto ya
deploya en Vercel: no requiere cuenta nueva ni SDK de AWS, y entrega URL pública
con CDN por delante.

### Por qué no guardar las imágenes en MongoDB

Se evaluó y se descartó, aunque con GridFS sería viable:

- **No hay CDN.** Cada imagen la serviría una función de Next leyendo de Mongo. Un
  menú digital recibe tráfico en ráfagas —una mesa entera escanea el QR a la vez—
  y las imágenes son casi todos los bytes de esa página.
- **Degrada el código actual.** `GET /api/products` hace
  `Product.find().populate('ingredients.ingredientId')` y devuelve todo. Con
  binarios en el documento, cada carga del POS arrastraría megabytes salvo agregar
  proyecciones en todas las consultas.
- **Storage en Atlas es más caro** que storage de objetos, y se pagaría por sede,
  porque cada tenant tiene su propia base.

Con el adaptador en su lugar, agregar un driver `gridfs`, `s3` o `r2` más adelante
es escribir una implementación; nada del módulo cambia.

### Generación de la clave

```
tenants/<tenantId>/products/<productId>-<8 hex aleatorios>.<ext>
```

Nunca se usa el nombre del archivo subido: es entrada controlada por el usuario.
`productId` se valida como ObjectId antes de construir la ruta, para que no pueda
inyectar segmentos de path.

## Validación en el servidor

El cliente comprime antes de subir, pero el servidor no confía en nada de lo que
el cliente afirma.

| Regla | Detalle |
|---|---|
| Formato | Detectado de los bytes reales del archivo, no del `type` del `File`, que el cliente elige. |
| Formatos permitidos | JPEG, PNG, WebP. |
| SVG | **Prohibido.** Un SVG es un documento que puede contener script; servirlo desde el mismo origen es un vector de XSS. |
| Tamaño | Máximo 4 MB. El número no es arbitrario: el body de una función serverless en Vercel tope en ~4.5 MB, así que subir más alto el límite no serviría de nada. |
| Dimensiones | Máximo 4000 px por lado y 16 megapíxeles en total, para rechazar bombas de descompresión. |
| `width` / `height` | Se leen del archivo. Lo que reporte el cliente se ignora. |

Para leer formato y dimensiones se agrega la dependencia **`image-size`**: parsea
solo los headers, no decodifica la imagen, y su detección de formato a partir de
los bytes cumple además la función de verificación de tipo.

Se descartó usar `sharp`: está presente en `node_modules` pero solo como
dependencia transitiva opcional de Next, no como dependencia directa. Depender de
algo que no está en `package.json` es frágil, y sus binarios son
específicos de plataforma. Tampoco hace falta, porque el redimensionado ocurre en
el cliente.

Las imágenes se guardan tal como llegan (ya comprimidas por el cliente) y se
sirven como archivo estático con su `Content-Type`. Nunca se decodifican del lado
del servidor.

## Endpoints

```
POST   /api/products/[id]/image    multipart/form-data → valida, sube, borra la anterior, guarda
DELETE /api/products/[id]/image    borra del almacenamiento y limpia el campo
```

Ambos con `requireModuleAccess(req, 'products')`, que es el gate canónico
(resuelve tenant, valida rol contra el módulo y valida que la cuenta tenga el
feature). Las rutas de `products` existentes usan el par más viejo
`resolveTenant` + `authorizeRequest`; no se migran en este trabajo.

Códigos de error: 400 formato o dimensiones inválidas, 413 archivo demasiado
grande, 403 sin acceso al módulo, 404 producto inexistente.

El 413 puede venir de dos lugares: de la validación propia, o de la plataforma
antes de que el handler llegue a ejecutarse, si el body excede el tope de Vercel.
La UI tiene que manejar un 413 sin cuerpo JSON.

## Arreglo puntual incluido

`POST /api/products` hace hoy `Product.create(body)` con el body completo, y
`PUT` tiene el mismo patrón. Con `image` en el esquema esto deja de ser tolerable:
un cliente podría escribir directamente una URL arbitraria en el campo,
salteándose toda la validación de subida.

Entra una whitelist explícita de campos aceptados en POST y PUT: `name`, `price`,
`categoryId`, `productSizeId`, `type`, `ingredients`, `allowsHalf`,
`allowsExtras`, `requiresKitchen`, `description`. **`image` no está en la lista**:
solo los dos endpoints de imagen lo escriben.

Es el cambio mínimo que el trabajo exige, no un refactor de las rutas de products.

## Ciclo de vida de los archivos

Solo hay dos caminos que borran archivos, y los dos están en este alcance:

- **Reemplazar** una foto borra la anterior del almacenamiento.
- **`DELETE /api/products/[id]/image`** borra el archivo y limpia el campo. Es
  idempotente: sobre un producto sin foto responde 200 sin hacer nada.

Si el borrado del archivo falla, se registra y la operación de base de datos
continúa. Un huérfano es preferible a un producto que queda inconsistente.

**Hoy no existe borrado de productos.** No hay endpoint `DELETE
/api/products/[id]` ni UI que lo ofrezca: solo `PUT`. Por eso no hay nada que
enganchar y no se agrega borrado de productos en este trabajo, que sería una
feature aparte. Cuando se implemente, tiene que borrar la imagen del producto, o
cada producto eliminado va a dejar su archivo huérfano.

## Compresión en el cliente

Un límite de 4 MB rechazaría fotos de celular, que pesan más. Antes de subir, el
navegador redimensiona a máximo 1600 px de lado largo y re-codifica como JPEG con
calidad 0.82. Una foto de 8 MB queda en ~200 KB, lo que además hace que el menú
público cargue rápido con datos móviles.

Dos detalles que son bugs si se ignoran:

- **Orientación EXIF.** Las fotos de teléfono traen metadata de rotación. Dibujar
  al canvas sin tenerla en cuenta produce platos de costado. Se usa
  `createImageBitmap(file, { imageOrientation: 'from-image' })`.
- **Fallo de decodificación.** Safari en iOS puede fallar al decodificar imágenes
  muy grandes en canvas. Si la compresión falla, se intenta subir el original si
  está bajo el límite; si no, se muestra un error pidiendo una foto más chica.

## Cambios de configuración

`next.config.mjs` hoy no tiene bloque `images`. Se agrega `images.remotePatterns`
con el host de Vercel Blob, necesario para que `next/image` acepte esas URLs. El
driver `local` no lo necesita porque devuelve rutas relativas.

En `.env.example`:

```bash
# 'local' (default en desarrollo) | 'vercel-blob'
STORAGE_DRIVER=local
# Solo si STORAGE_DRIVER=vercel-blob
BLOB_READ_WRITE_TOKEN=
```

## Cambios de interfaz

- `src/app/components/products/product-dialog.jsx`: textarea de descripción con
  contador de caracteres, y una zona de imagen con previsualización, reemplazar y
  quitar.
- `src/app/components/products/product-card.jsx` y
  `src/app/components/sales/product-card.jsx`: usan la foto si existe y caen al
  ícono actual si no.
- Textos nuevos en `messages/es.json` y `messages/en.json`, namespace `Products`.

El feedback de tap del sub-proyecto anterior en `sales/product-card.jsx` —el
destello y el check de confirmación— se conserva sobre la imagen.

## Pruebas

El repo no tiene test runner. Se agrega **Vitest** cubriendo solo lógica pura, sin
I/O:

- Allowlist de formatos: acepta JPEG, PNG, WebP; rechaza SVG, GIF, PDF y un
  archivo de texto renombrado a `.jpg`.
- Límites de tamaño y de dimensiones, incluyendo el de megapíxeles totales.
- Construcción de la clave de almacenamiento: rechaza un `productId` que no es
  ObjectId, e ignora el nombre del archivo original.
- Whitelist de campos de producto: descarta claves desconocidas y descarta
  `image`.

No se prueban los route handlers ni los drivers de almacenamiento: montar mocks
de las conexiones por tenant es un trabajo considerable y frenaría este
sub-proyecto. Queda como deuda consciente, y la base de Vitest queda instalada
para los sub-proyectos siguientes, sobre todo para el esquema de bloques del 1a.

### Verificación manual

Además de `npm run build` y `npx eslint src`, con `STORAGE_DRIVER=local`:

1. Subir un JPEG, un PNG y un WebP; los tres se ven en la tarjeta del producto.
2. Subir una foto de celular en vertical: se muestra derecha, no de costado.
3. Renombrar un `.txt` a `.jpg` y subirlo: se rechaza con 400.
4. Subir un archivo de más de 4 MB: se rechaza con 413.
5. Reemplazar una foto: el archivo anterior desaparece de `public/uploads`.
6. Borrar la foto: el campo queda vacío y la tarjeta vuelve al ícono.
7. Volver a llamar al borrado sobre el mismo producto: responde 200, no falla.
8. Abrir `/orders` en 375 px: la tarjeta con foto mantiene el destello de tap.

## Riesgos

- **Sin cuota de almacenamiento.** Nada limita cuántas fotos sube una cuenta. Con
  imágenes de ~200 KB el costo es despreciable, pero es una puerta abierta.
- **Fotos duplicadas entre sedes.** Los productos viven en la base de cada sede,
  así que una cadena de tres sucursales sube la misma foto tres veces. Coherente
  con cómo ya funcionan los precios; unificarlo requeriría un catálogo a nivel
  empresa.
- **Divergencia entre drivers.** Un bug que solo aparezca en `vercel-blob` no se
  va a ver en desarrollo. Se mitiga manteniendo los drivers finos: toda la lógica
  real vive fuera de ellos.
- **Huérfanos por falta de borrado de productos.** Mientras no exista `DELETE
  /api/products/[id]`, un producto que se quiera eliminar no se puede, así que el
  problema no se manifiesta todavía. Es una trampa para quien implemente esa
  feature después.

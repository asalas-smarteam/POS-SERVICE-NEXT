# Módulo "Menú en línea" — decomposición y decisiones

Fecha: 2026-08-21
Estado: aprobado

Documento padre del módulo. Fija las decisiones transversales y el corte en
sub-proyectos. Cada sub-proyecto tiene su propio spec e implementación.

## Objetivo

Que el dueño de una cuenta pueda armar el menú público de cada una de sus sedes,
personalizarlo, y obtener un link para compartir o imprimir en un QR.

## Cómo encaja en la modularidad existente

`src/app/lib/features/featureRegistry.js` es la fuente única de verdad de qué
módulos existen. Agregar un módulo vendible es: una key en `FEATURE_DEFINITIONS`,
una fila en `FeaturePrice`, textos en el namespace `Plans` de `messages/*.json`,
y —si es una ruta de sede— entrada en `ROLE_PERMISSIONS` y en el nav.

Este módulo rompe parcialmente la regla "cada ruta del dashboard es un feature
vendible", y es intencional:

- El **editor** vive en `/[locale]/admin/[companyId]/menu`, dentro del panel del
  dueño, porque solo el dueño de la cuenta lo administra. No es una ruta de sede
  y **no aparece en el sidebar de ninguna sede**.
- El **menú público** vive en `/m/<slug>`, sin locale y sin token. Es la primera
  ruta pública del proyecto fuera de `/login` y `/register`.
- La **feature key** existe igual en el registro, porque es lo que hace que el
  módulo se pueda vender, cobrar y activar como add-on.

`resolveAdminPanelFromPath` solo mira los segmentos `admin/{companyId}`, así que
cualquier sub-ruta del panel del dueño ya queda protegida owner-only por el
middleware actual. El editor no requiere cambios de middleware.

## Decisiones transversales

| Tema | Decisión |
|---|---|
| Alcance de v1 | Solo lectura. Nadie ordena desde el menú. |
| Pedidos en línea | Módulo vendible aparte, más adelante (sub-proyecto 4). |
| Reparto por sede | Un menú por sede, con clonado del menú de una sede a las demás. |
| Quién administra | Solo el dueño de la cuenta (`CompanyUser`, `kind: 'owner'`), desde su panel. Ningún rol de sede edita el menú. |
| Link público | Ruta: `<dominio>/m/<slug>`. Un slug por sede. |
| Personalización | Esquema de bloques versionado, catálogo chico en v1. |
| Layout | Bloques responsive con variantes de diseño. **No** canvas de posicionamiento libre. |
| Origen del contenido | Los bloques referencian categorías y productos por id. Nunca copian nombres ni precios. |

### Por qué bloques y no canvas

Un canvas de posicionamiento libre produce layouts que se rompen en pantallas
angostas, y la mayoría del tráfico de un menú digital llega desde un teléfono
que acaba de escanear un QR. Un modelo de bloques da la misma sensación de
"constructor" —elegir qué poner, en qué orden y con qué variante— manteniendo el
control del layout responsive del lado del código.

### Por qué los bloques referencian y no copian

Precios y disponibilidad viven en `Product`, en la base de datos de cada sede, y
cambian a diario. Un bloque que guardara una copia del producto produciría menús
públicos mostrando precios viejos. La configuración del menú guarda estructura y
estilo; el contenido se resuelve en cada render.

## Decomposición

Orden de construcción. Cada uno con su propio spec, plan e implementación.

### 0. Fotos y descripciones de producto — prerrequisito

Agrega `image` y `description` a `Product`, con un adaptador de almacenamiento de
archivos. **No es un módulo vendible**: es una mejora del módulo `products`, que
es `requiredForCustom` y por lo tanto lo tienen todas las cuentas. Beneficia al
POS entero, no solo al menú.

Spec: `2026-08-21-product-images-design.md`

### 1a. Motor del menú

Esquema de bloques versionado, renderizador público, modelo de slug por sede y
ruta `/m/<slug>`. La configuración se edita con un formulario mínimo, sin drag &
drop. Al terminar, ya hay menús públicos funcionando y el módulo es vendible.

Incluye el flujo borrador/publicado y la revalidación de la página pública.

Spec: `2026-08-22-online-menu-engine-design.md`

### 1b. Editor visual

Drag & drop del orden de bloques (`@dnd-kit`, ya instalado), variantes de diseño
por bloque, tema global (logo, colores, tipografía), vista previa en vivo y
clonado del menú entre sedes.

#### Referencias de presentación para el bloque de categoría

El dueño del proyecto aportó cuatro menús reales de pizzería. De ellos salen tres
patrones distintos de presentar tamaños, y el sub-proyecto 1b tiene que soportar
elegir entre ellos por bloque:

| Patrón | Cómo funciona | ¿Lo soportan los datos actuales? |
|---|---|---|
| **Columnas de precio** | Encabezado con los tamaños y cada plato con sus precios alineados en columnas. Un plato puede tener un solo precio. | Sí |
| **Tabla de precios única** | Tamaños y precios salen una vez para toda la categoría; los platos se listan solo con nombre e ingredientes. | **No garantizado** |
| **Badges por ítem** | Tarjeta con foto y descripción, más un badge por tamaño con su precio debajo. | Sí |

El patrón de tabla única asume que todos los platos de la categoría cuestan lo
mismo por tamaño. El modelo no lo garantiza: cada tamaño es un `Product` con su
precio propio, así que dos pizzas pueden diferir en el precio de "Grande". Antes de
ofrecer ese patrón hay que decidir qué hacer cuando los precios no son uniformes:
deshabilitarlo, mostrar un rango, o derivar la tabla y advertir en el editor.

Dos observaciones más de las referencias: las descripciones de ingredientes son
centrales en tres de los cuatro menús, y dos usan **doble columna** en pantalla
angosta larga. El renderizador de 1a es de una sola columna con foto de 80 px.

1a implementa un solo comportamiento por defecto: si la categoría tiene `hasSizes`,
agrupa los productos por nombre y lista una fila por tamaño. Sin selector.

### 2. Catálogo de bloques ampliado

Galería, mapa, promociones, redes sociales. Puro agregar tipos sobre el esquema
ya definido en 1a.

### 3. QR y analítica

QR imprimible por sede y conteo de visitas. Requiere una dependencia nueva de
generación de QR.

### 4. Pedidos en línea — módulo vendible aparte

WhatsApp o carrito real. El esquema de bloques de 1a deja lugar para un bloque de
acción sin comprometerse con ninguna de las dos variantes.

### 5. Dominio propio — add-on

`menu.cliente.com` apuntando a la app: verificación de dominio y emisión de
certificados vía API de Vercel, más una tabla de mapeo dominio → sede.

## No-objetivos de v1

- Pedidos, carrito, pagos.
- Menú multi-idioma. `Product.name` es un solo string; traducir el catálogo es un
  cambio de modelo de datos propio.
- Subdominio por cliente y dominio propio.
- Catálogo de productos compartido entre sedes.
- Editor accesible desde el dashboard de una sede.

## Deuda y riesgos detectados durante el diseño

Hallazgos del código actual que afectan a este trabajo. No se arreglan todos acá;
se registran para que las decisiones sean informadas.

1. **No hay infraestructura de tests.** No hay jest, vitest ni script `test` en
   `package.json`. El sub-proyecto 0 introduce Vitest para lógica pura y deja la
   base instalada para los siguientes.

2. **Asignación masiva en las rutas de products.** `POST /api/products` hace
   `Product.create(body)` con el body completo. Con `image` en el esquema esto
   permitiría escribir una URL arbitraria salteándose la validación de subida. Se
   arregla en el sub-proyecto 0 con una whitelist de campos.

3. **Dos patrones de gate coexisten.** `requireModuleAccess` (canónico: tenant +
   rol + feature) y el par `resolveTenant` + `authorizeRequest`, que no chequea
   feature. Las rutas de `products` usan el segundo. Hoy es inocuo porque
   `products` es `requiredForCustom`. Los endpoints nuevos usan el canónico; no se
   migran los existentes en este trabajo.

4. **Una feature key sin ruta de sede tiene dos efectos secundarios.**
   `PROTECTED_MODULES` deriva de `ALL_FEATURE_KEYS`, así que el middleware
   protegería una ruta de sede que no existe (inocuo: da 404 tras el gate). Y
   `resolveFallbackModule` podría teóricamente redirigir ahí; en la práctica no,
   porque `dashboard` gana primero para el rol admin. Se revisa al implementar 1a.

5. **Las fotos se duplican entre sedes.** Los productos viven en la base de datos
   de cada sede, así que una cadena de tres sucursales sube la misma foto tres
   veces. Es coherente con cómo ya funcionan los precios. Unificarlo requeriría un
   catálogo a nivel empresa, que es otro proyecto.

6. **No hay cuota de almacenamiento por cuenta.** Nada limita cuántas fotos sube
   un tenant. Con imágenes comprimidas a ~200 KB el costo es despreciable, pero es
   una puerta abierta.

7. **Los productos no se pueden borrar.** No existe `DELETE /api/products/[id]`
   ni UI de borrado; solo `PUT`. No se agrega en este trabajo, pero condiciona el
   ciclo de vida de las imágenes del sub-proyecto 0 y hay que tenerlo en cuenta
   cuando esa feature se implemente.

8. **El desacople de `ALL_FEATURE_KEYS` quedo a medias.** El sub-proyecto 1a
   introdujo la marca `companyScoped` y arreglo `PROTECTED_MODULES` y
   `ROLE_PERMISSIONS.admin`, pero `src/app/components/nav-main.jsx`,
   `src/store/authStore.js` y `src/app/[locale]/(dashboard)/layout.jsx` siguen
   tratando toda feature key como candidata a ruta de sede. Hoy es inocuo porque
   `NAV_BY_ROLE` en `lib/auth/roles.js` se escribe a mano y no tiene entrada
   `/online-menu`. La proxima feature company-scoped, o cualquier refactor de como
   se arma el nav, reproduce la clase de bug que la marca existe para eliminar.

9. **Subir `FEATURE_PRICES_SEED_VERSION` pisa los precios editados a mano.** El
   contador es compartido por todas las filas del seed. Agregar una feature NO
   requiere subirlo: `$setOnInsert` siembra la fila nueva con la version vigente y
   el `$set` masivo solo alcanza filas con version menor. Subirlo es el mecanismo
   para propagar precios cambiados a todos, y hay que usarlo a proposito.


# Motor del menú en línea — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el dueño de una cuenta arme el menú público de una sede desde su panel y obtenga un link `/m/<slug>` para compartir o imprimir en un QR.

**Architecture:** El slug vive en el master DB (`Tenant.menuSlug`) porque resolver el link tiene que pasar antes de saber a qué base conectarse. La configuración del menú vive en la base de la sede, como un `TenantSetting`, con borrador y publicado en el mismo documento. La página pública es un Server Component fuera de `[locale]`, cacheado 60 segundos. Toda la lógica de esquema y slug es pura y probada con Vitest; los route handlers solo orquestan.

**Tech Stack:** Next.js 16 (App Router, Server Components, ISR), Mongoose (una base por tenant + master), next-intl, Tailwind v4, Vitest.

**Spec:** `docs/superpowers/specs/2026-08-22-online-menu-engine-design.md`
**Padre:** `docs/superpowers/specs/2026-08-21-online-menu-roadmap.md`

## Global Constraints

- Feature key: **`online-menu`**, marcada `companyScoped: true`.
- Versión del esquema: **`MENU_SCHEMA_VERSION = 1`**.
- Tipos de bloque, exactamente estos tres: **`hero`**, **`category`**, **`footer`**.
- Slug: **`a-z`, `0-9` y guion**; **3 a 40** caracteres; sin guion al inicio ni al final, sin guiones dobles; almacenado siempre en minúsculas; **único global**.
- Ruta pública: **`/m/<slug>`**, fuera de `[locale]`, con **`export const revalidate = 60`**.
- `m` se suma al lookahead negativo del `matcher` del middleware. Marcarla pública en `routeDefinitions` **no alcanza**: `intlMiddleware(request)` corre en la primera línea del middleware, antes de ese chequeo.
- La página pública verifica que `Tenant.features` incluya `online-menu`. Si no, **404**.
- Slug desconocido, sede inactiva, feature no contratado y menú nunca publicado: los cuatro responden **404** vía `notFound()`, sin distinguir el caso.
- La página pública lee **solo** `published`, nunca `draft`.
- Los bloques referencian categorías por id. **Nunca** se copian nombres ni precios.
- El menú es una **whitelist**: una categoría solo aparece si tiene su bloque.
- La consulta de productos es **una sola** para todos los `categoryId` referenciados, no una por bloque.
- API del editor: `getOwnerContext(req)` y después verificar que la sede pertenezca a la empresa con `Tenant.findOne({ tenantId, companyId, status: 'active' })`, **403** si no.
- Los mensajes de error se enmascaran cuando el status cae a 500, siguiendo el patrón de `src/app/api/company/sedes/route.js`.
- Errores de validación devueltos como **códigos** (`slug_too_short`, `slug_taken`, …), no como frases. El formulario los traduce. Es una divergencia deliberada de la convención del repo: en el sub-proyecto 0 los mensajes crudos del servidor terminaron mostrando inglés en una UI española.
- Los archivos de test se llaman `*.test.js`, viven junto al código que prueban, e importan `describe`/`it`/`expect` explícitamente desde `vitest`.
- Todos los archivos del repo usan CRLF (`core.autocrlf=true`). No convertir a LF.
- Textos de interfaz siempre por `next-intl`, en `messages/es.json` y `messages/en.json`, con el mismo set de claves en los dos.
- Comentarios de código en español, solo donde expliquen un *por qué*.
- Nada de `Date.now()` dentro de las funciones puras: la fecha se inyecta como parámetro para que los tests sean deterministas.

---

## Estructura de archivos

**Crear:**

| Archivo | Responsabilidad |
|---|---|
| `src/app/lib/menu/menuSlug.js` | Normalizar y validar el slug. Puro. |
| `src/app/lib/menu/menuSlug.test.js` | Tests de lo anterior |
| `src/app/lib/menu/menuSchema.js` | Esquema de bloques: normalizar, publicar, filtrar renderizables. Puro. |
| `src/app/lib/menu/menuSchema.test.js` | Tests de lo anterior |
| `src/app/lib/menu/menuSettings.js` | Leer y escribir el `TenantSetting` del menú (base de la sede) |
| `src/app/lib/menu/menuTenant.js` | Resolver sede por slug y asignar slug (master DB) |
| `src/app/api/company/sedes/[tenantId]/menu/route.js` | `GET` y `PUT` de la configuración |
| `src/app/api/company/sedes/[tenantId]/menu/publish/route.js` | `POST` publicar + revalidar |
| `src/app/m/[slug]/page.jsx` | Página pública, cacheada 60 s |
| `src/app/m/[slug]/menu-blocks.jsx` | Componentes de presentación de los tres bloques |
| `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx` | Formulario mínimo del editor |

**Modificar:**

| Archivo | Cambio |
|---|---|
| `src/app/lib/features/featureRegistry.js` | Feature `online-menu` + marca `companyScoped` + `COMPANY_SCOPED_FEATURES` |
| `src/app/lib/features/featureRegistry.test.js` | Nuevo archivo de tests del registro |
| `src/app/lib/security/routeDefinitions.js` | `PROTECTED_MODULES` excluye las company-scoped |
| `src/app/lib/security/rolePermissions.js` | `ROLE_PERMISSIONS.admin` excluye las company-scoped |
| `src/app/lib/master/featurePrices.js` | Precio del módulo + subir `FEATURE_PRICES_SEED_VERSION` |
| `src/app/models/master/Tenant.js` | Campo `menuSlug` con índice único disperso |
| `src/middleware.js` | `m` fuera del matcher |
| `src/app/[locale]/admin/[companyId]/page.jsx` | Botón "Menú" en la fila de sede |
| `messages/es.json`, `messages/en.json` | `Plans.feature.online-menu` y namespace `OnlineMenu` |

## Nota sobre TDD en este plan

Las tareas 1 a 3 son TDD estricto: son lógica pura y es donde vive todo el riesgo de corrección del esquema.

Las tareas 4 a 8 no llevan tests automatizados, por la decisión del spec: probar route handlers y Server Components exige mockear las conexiones por tenant, un trabajo comparable al del sub-proyecto entero. Cierran con **verificación concreta** — chequeos de esquema en Node, `npm run build` confirmando que las rutas aparecen, y pasos de navegador donde hagan falta. Si la verificación no da lo esperado, la tarea no está terminada.

**Los pasos que requieren navegador con sesión de dueño no los puede hacer un subagente** (no hay credenciales). Esos quedan marcados como `[MANUAL]` y se juntan en un checklist al final.

---

### Task 1: Feature `online-menu` y features company-scoped

El registro deriva `PROTECTED_MODULES` y `ROLE_PERMISSIONS.admin` de `ALL_FEATURE_KEYS`. Este módulo es vendible pero **no es una ruta de sede**, así que derivar de él protegería una ruta inexistente y lo ofrecería a un rol que no puede usarlo. La marca `companyScoped` es lo que rompe ese acople.

**Files:**
- Modify: `src/app/lib/features/featureRegistry.js`
- Test: `src/app/lib/features/featureRegistry.test.js`
- Modify: `src/app/lib/security/routeDefinitions.js`
- Modify: `src/app/lib/security/rolePermissions.js`
- Modify: `src/app/lib/master/featurePrices.js`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `COMPANY_SCOPED_FEATURES` — array congelado de keys con `companyScoped: true`.
  - `isCompanyScopedFeature(key)` → boolean.
  - `SEDE_ROUTE_FEATURE_KEYS` — `ALL_FEATURE_KEYS` menos las company-scoped. Es lo que consumen `PROTECTED_MODULES` y `ROLE_PERMISSIONS.admin`.
  - La key `online-menu` existe, es seleccionable y **no** es una ruta de sede.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/lib/features/featureRegistry.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  ALL_FEATURE_KEYS,
  COMPANY_SCOPED_FEATURES,
  SEDE_ROUTE_FEATURE_KEYS,
  SELECTABLE_FEATURE_KEYS,
  hasFeature,
  isCompanyScopedFeature,
  isKnownFeature,
  resolveFeatures,
} from "@/lib/features/featureRegistry";

describe("registro de features: online-menu", () => {
  it("existe como feature conocida", () => {
    expect(isKnownFeature("online-menu")).toBe(true);
    expect(ALL_FEATURE_KEYS).toContain("online-menu");
  });

  it("es vendible: aparece en el catalogo de features seleccionables", () => {
    expect(SELECTABLE_FEATURE_KEYS).toContain("online-menu");
  });

  it("esta marcada como company-scoped", () => {
    expect(isCompanyScopedFeature("online-menu")).toBe(true);
    expect(COMPANY_SCOPED_FEATURES).toContain("online-menu");
  });

  it("NO es una ruta de sede", () => {
    expect(SEDE_ROUTE_FEATURE_KEYS).not.toContain("online-menu");
  });

  it("resolveFeatures la conserva cuando esta contratada", () => {
    expect(resolveFeatures(["orders", "online-menu"])).toContain("online-menu");
  });

  it("hasFeature la niega cuando no esta contratada", () => {
    expect(hasFeature(["orders"], "online-menu")).toBe(false);
    expect(hasFeature(["orders", "online-menu"], "online-menu")).toBe(true);
  });
});

describe("company-scoped como concepto", () => {
  it("las features de ruta de sede no estan marcadas company-scoped", () => {
    for (const key of SEDE_ROUTE_FEATURE_KEYS) {
      expect(isCompanyScopedFeature(key)).toBe(false);
    }
  });

  it("SEDE_ROUTE_FEATURE_KEYS mas COMPANY_SCOPED_FEATURES cubre todo el registro", () => {
    expect([...SEDE_ROUTE_FEATURE_KEYS, ...COMPANY_SCOPED_FEATURES].sort()).toEqual(
      [...ALL_FEATURE_KEYS].sort()
    );
  });

  it("isCompanyScopedFeature es falso para una key desconocida", () => {
    expect(isCompanyScopedFeature("no-existe")).toBe(false);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm test`
Expected: FAIL — `COMPANY_SCOPED_FEATURES` no está exportado.

- [ ] **Step 3: Agregar la feature y las derivaciones al registro**

En `src/app/lib/features/featureRegistry.js`, agregar la entrada al final del array `FEATURE_DEFINITIONS`:

```js
  // Modulo vendible sin ruta de sede: el editor vive en el panel del dueño y la
  // pagina publica en /m/<slug>. Por eso no entra en PROTECTED_MODULES ni en
  // ROLE_PERMISSIONS, que son ejes de sede.
  { key: "online-menu", companyScoped: true },
```

Y agregar estas derivaciones después de `SELECTABLE_FEATURE_KEYS`:

```js
// Features que se administran a nivel empresa y no tienen ruta de sede. Se
// venden igual, pero no son un modulo del dashboard de una sede.
export const COMPANY_SCOPED_FEATURES = Object.freeze(
  FEATURE_DEFINITIONS.filter((feature) => feature.companyScoped).map((feature) => feature.key)
);

// Las que si son una ruta de sede. Es lo que deben consumir el matcher de rutas
// protegidas y los permisos por rol: derivar de ALL_FEATURE_KEYS haria que el
// middleware protegiera rutas que no existen.
export const SEDE_ROUTE_FEATURE_KEYS = Object.freeze(
  ALL_FEATURE_KEYS.filter((key) => !COMPANY_SCOPED_FEATURES.includes(key))
);

export const isCompanyScopedFeature = (key) =>
  typeof key === "string" && COMPANY_SCOPED_FEATURES.includes(key);
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm test`
Expected: PASS, 9 tests nuevos.

- [ ] **Step 5: Desacoplar `PROTECTED_MODULES`**

En `src/app/lib/security/routeDefinitions.js`, cambiar el import y la constante:

```js
import { SEDE_ROUTE_FEATURE_KEYS } from "@/lib/features/featureRegistry";

// Cada ruta de sede del registro es una ruta protegida. Derivado en vez de
// escrito a mano: la lista manual habia perdido 'floor', que quedaba sin chequeo
// de rol ni de pertenencia de tenant. Se excluyen las features company-scoped,
// que no tienen ruta de sede que proteger.
export const PROTECTED_MODULES = SEDE_ROUTE_FEATURE_KEYS;
```

- [ ] **Step 6: Desacoplar `ROLE_PERMISSIONS`**

En `src/app/lib/security/rolePermissions.js`, cambiar el import y la fila de `admin`:

```js
import { SEDE_ROUTE_FEATURE_KEYS, hasFeature } from "@/lib/features/featureRegistry";
```

```js
  // Solo rutas de sede: los roles son un eje de sede, y las features
  // company-scoped las administra el dueño desde su panel, no un rol.
  admin: SEDE_ROUTE_FEATURE_KEYS,
```

- [ ] **Step 7: Sembrar el precio del módulo**

En `src/app/lib/master/featurePrices.js`: subir la versión de siembra a `2` y agregar la fila.

```js
export const FEATURE_PRICES_SEED_VERSION = 2;
```

```js
  { key: 'online-menu', monthlyPrice: 10, pricePerExtraBranch: 4, sortOrder: 80 },
```

- [ ] **Step 8: Agregar los textos del módulo**

En `messages/es.json`, dentro de `Plans.feature`:

```json
"online-menu": {
  "name": "Menú en línea",
  "description": "Menú público con link para compartir o imprimir en un QR"
}
```

En `messages/en.json`, dentro de `Plans.feature`:

```json
"online-menu": {
  "name": "Online menu",
  "description": "Public menu with a link to share or print as a QR code"
}
```

- [ ] **Step 9: Verificar**

Run: `npm test && npx eslint --no-cache src && npm run build`
Expected: tests PASS; ESLint con los mismos 11 problemas preexistentes (4 errores, 7 warnings) y ninguno nuevo; build `✓ Compiled successfully`.

Verificación extra, que confirma que la feature nueva no ensució las derivaciones de
seguridad. **No se puede hacer con `node` pelado**: los modulos de seguridad importan
por el alias `@/`, que solo resuelven Next y Vitest. Se hace agregando estas tres
aserciones al archivo de test del Step 1, que es donde deberian vivir de todos modos:

```js
import { PROTECTED_MODULES } from "@/lib/security/routeDefinitions";
import { ROLE_PERMISSIONS } from "@/lib/security/rolePermissions";

describe("las derivaciones de seguridad no se ensucian", () => {
  it("online-menu no es una ruta protegida", () => {
    expect(PROTECTED_MODULES).not.toContain("online-menu");
  });

  it("online-menu no aparece en ningun rol", () => {
    for (const modules of Object.values(ROLE_PERMISSIONS)) {
      expect(modules).not.toContain("online-menu");
    }
  });

  it("PROTECTED_MODULES sigue conteniendo las rutas de sede reales", () => {
    expect(PROTECTED_MODULES).toContain("orders");
    expect(PROTECTED_MODULES).toContain("floor");
  });
});
```

La version original de este paso era un one-liner de `node` y no funcionaba:

```bash
node --input-type=module -e "
const r = await import('./src/app/lib/features/featureRegistry.js');
const { PROTECTED_MODULES } = await import('./src/app/lib/security/routeDefinitions.js');
const { ROLE_PERMISSIONS } = await import('./src/app/lib/security/rolePermissions.js');
console.log('protegidas:', PROTECTED_MODULES.join(','));
console.log('admin:', ROLE_PERMISSIONS.admin.join(','));
console.log('online-menu protegida?', PROTECTED_MODULES.includes('online-menu'));
console.log('online-menu en algun rol?', Object.values(ROLE_PERMISSIONS).some(l => l.includes('online-menu')));
console.log('online-menu vendible?', r.SELECTABLE_FEATURE_KEYS.includes('online-menu'));
"
```
Expected: `online-menu protegida? false`, `online-menu en algun rol? false`, `online-menu vendible? true`.

- [ ] **Step 10: Commit**

```bash
git add src/app/lib/features src/app/lib/security src/app/lib/master/featurePrices.js messages
git commit -m "feat(online-menu): feature vendible sin ruta de sede"
```

---

### Task 2: Validación del slug

**Files:**
- Create: `src/app/lib/menu/menuSlug.js`
- Test: `src/app/lib/menu/menuSlug.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `normalizeMenuSlug(value)` → string en minúsculas, sin espacios al borde.
  - `validateMenuSlug(value)` → código de error (`'slug_too_short' | 'slug_too_long' | 'slug_invalid'`) o `null` si es válido.
  - `MENU_SLUG_MIN = 3`, `MENU_SLUG_MAX = 40`.
  - `MENU_SLUG_ERRORS` — objeto congelado con los tres códigos más `TAKEN: 'slug_taken'`, que usa la API cuando el índice único rechaza.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/lib/menu/menuSlug.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  MENU_SLUG_MAX,
  MENU_SLUG_MIN,
  normalizeMenuSlug,
  validateMenuSlug,
} from "@/lib/menu/menuSlug";

describe("normalizeMenuSlug", () => {
  it("baja a minusculas y recorta espacios", () => {
    expect(normalizeMenuSlug("  Pizzeria-Luigi  ")).toBe("pizzeria-luigi");
  });

  it("devuelve cadena vacia para valores ausentes", () => {
    expect(normalizeMenuSlug(null)).toBe("");
    expect(normalizeMenuSlug(undefined)).toBe("");
  });
});

describe("validateMenuSlug", () => {
  it("acepta un slug valido", () => {
    expect(validateMenuSlug("pizzeria-luigi")).toBeNull();
    expect(validateMenuSlug("cafe-2")).toBeNull();
    expect(validateMenuSlug("abc")).toBeNull();
  });

  it("acepta mayusculas porque normaliza antes de validar", () => {
    expect(validateMenuSlug("Pizzeria-Luigi")).toBeNull();
  });

  it("rechaza por corto", () => {
    expect(validateMenuSlug("ab")).toBe("slug_too_short");
    expect(validateMenuSlug("")).toBe("slug_too_short");
  });

  it("rechaza por largo", () => {
    expect(validateMenuSlug("a".repeat(MENU_SLUG_MAX + 1))).toBe("slug_too_long");
    expect(validateMenuSlug("a".repeat(MENU_SLUG_MAX))).toBeNull();
    expect(validateMenuSlug("a".repeat(MENU_SLUG_MIN))).toBeNull();
  });

  it("rechaza guion al inicio o al final", () => {
    expect(validateMenuSlug("-pizzeria")).toBe("slug_invalid");
    expect(validateMenuSlug("pizzeria-")).toBe("slug_invalid");
  });

  it("rechaza guiones dobles", () => {
    expect(validateMenuSlug("pizzeria--luigi")).toBe("slug_invalid");
  });

  it("rechaza caracteres fuera del set", () => {
    expect(validateMenuSlug("pizzeria luigi")).toBe("slug_invalid");
    expect(validateMenuSlug("pizzería")).toBe("slug_invalid");
    expect(validateMenuSlug("pizza/luigi")).toBe("slug_invalid");
    expect(validateMenuSlug("pizza_luigi")).toBe("slug_invalid");
    expect(validateMenuSlug("pizza.luigi")).toBe("slug_invalid");
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm test`
Expected: FAIL — no se puede resolver `@/lib/menu/menuSlug`.

- [ ] **Step 3: Implementar**

Crear `src/app/lib/menu/menuSlug.js`:

```js
export const MENU_SLUG_MIN = 3;
export const MENU_SLUG_MAX = 40;

export const MENU_SLUG_ERRORS = Object.freeze({
  TOO_SHORT: "slug_too_short",
  TOO_LONG: "slug_too_long",
  INVALID: "slug_invalid",
  TAKEN: "slug_taken",
});

// Grupos alfanumericos separados por un solo guion: cubre a la vez el set de
// caracteres, el guion al borde y los guiones dobles.
const MENU_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeMenuSlug(value) {
  return String(value ?? "").trim().toLowerCase();
}

// Devuelve un codigo de error o null. Codigo y no frase: el formulario lo
// traduce, para que el servidor no imponga el idioma de la interfaz.
export function validateMenuSlug(value) {
  const slug = normalizeMenuSlug(value);

  if (slug.length < MENU_SLUG_MIN) {
    return MENU_SLUG_ERRORS.TOO_SHORT;
  }

  if (slug.length > MENU_SLUG_MAX) {
    return MENU_SLUG_ERRORS.TOO_LONG;
  }

  if (!MENU_SLUG_PATTERN.test(slug)) {
    return MENU_SLUG_ERRORS.INVALID;
  }

  return null;
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm test`
Expected: PASS, 9 tests nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/menu/menuSlug.js src/app/lib/menu/menuSlug.test.js
git commit -m "feat(online-menu): validacion del slug publico"
```

---

### Task 3: Esquema de bloques

El corazón del sub-proyecto. `version` es lo único que no se puede agregar después sin migrar menús ya publicados.

**Files:**
- Create: `src/app/lib/menu/menuSchema.js`
- Test: `src/app/lib/menu/menuSchema.test.js`

**Interfaces:**
- Consumes: nada.
- Produces:
  - `MENU_SCHEMA_VERSION = 1`, `BLOCK_TYPES = ['hero','category','footer']`.
  - `createEmptyMenu()` → `{ version, draft: { blocks: [] }, published: null, publishedAt: null }`.
  - `normalizeMenuDraft(raw)` → `{ blocks: [...] }`. Descarta tipos desconocidos, descarta bloques `category` sin `categoryId`, deduplica por `categoryId` conservando el primero, rellena defaults y conserva el orden.
  - `normalizeMenuDocument(raw)` → documento completo normalizado, tolerante a `null`.
  - `canPublish(menu)` → código de error (`'empty_draft'`) o `null`.
  - `publishDraft(menu, publishedAtIso)` → documento con `published` igual al `draft` normalizado y `publishedAt` sellado. La fecha se inyecta.
  - `renderableBlocks(blocks, categoryMap)` → bloques a renderizar. `categoryMap` es un `Map<string, { id, label, active }>`.
  - `referencedCategoryIds(blocks)` → array de ids únicos de los bloques `category` visibles.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/lib/menu/menuSchema.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  BLOCK_TYPES,
  MENU_SCHEMA_VERSION,
  canPublish,
  createEmptyMenu,
  normalizeMenuDocument,
  normalizeMenuDraft,
  publishDraft,
  referencedCategoryIds,
  renderableBlocks,
} from "@/lib/menu/menuSchema";

const heroRaw = { id: "h1", type: "hero", data: { title: "Pizzeria", subtitle: "Desde 1998" } };
const catRaw = (categoryId, extra = {}) => ({
  id: `c-${categoryId}`,
  type: "category",
  data: { categoryId, ...extra },
});
const footerRaw = { id: "f1", type: "footer", data: { text: "Gracias", phone: "22334455", address: "Centro" } };

describe("createEmptyMenu", () => {
  it("arranca versionado, con borrador vacio y sin publicar", () => {
    expect(createEmptyMenu()).toEqual({
      version: MENU_SCHEMA_VERSION,
      draft: { blocks: [] },
      published: null,
      publishedAt: null,
    });
  });
});

describe("normalizeMenuDraft", () => {
  it("conserva los tres tipos validos y su orden", () => {
    const result = normalizeMenuDraft({ blocks: [heroRaw, catRaw("bebidas"), footerRaw] });
    expect(result.blocks.map((b) => b.type)).toEqual(["hero", "category", "footer"]);
  });

  it("descarta tipos desconocidos", () => {
    const result = normalizeMenuDraft({ blocks: [heroRaw, { type: "carousel", data: {} }] });
    expect(result.blocks).toHaveLength(1);
  });

  it("descarta un bloque de categoria sin categoryId", () => {
    const result = normalizeMenuDraft({ blocks: [{ type: "category", data: {} }] });
    expect(result.blocks).toEqual([]);
  });

  it("deduplica categorias repetidas conservando la primera", () => {
    const result = normalizeMenuDraft({
      blocks: [catRaw("bebidas", { showPhotos: false }), catRaw("bebidas", { showPhotos: true })],
    });
    expect(result.blocks).toHaveLength(1);
    expect(result.blocks[0].data.showPhotos).toBe(false);
  });

  it("rellena defaults de un bloque de categoria", () => {
    const [block] = normalizeMenuDraft({ blocks: [catRaw("postres")] }).blocks;
    expect(block).toEqual({
      id: "c-postres",
      type: "category",
      visible: true,
      data: { categoryId: "postres", showPhotos: true, showDescriptions: true },
    });
  });

  it("respeta visible false", () => {
    const [block] = normalizeMenuDraft({ blocks: [{ ...heroRaw, visible: false }] }).blocks;
    expect(block.visible).toBe(false);
  });

  it("genera un id cuando falta", () => {
    const [block] = normalizeMenuDraft({ blocks: [{ type: "hero", data: {} }] }).blocks;
    expect(block.id).toBe("hero-0");
  });

  it("tolera entradas basura", () => {
    expect(normalizeMenuDraft(null).blocks).toEqual([]);
    expect(normalizeMenuDraft({ blocks: "no soy un array" }).blocks).toEqual([]);
    expect(normalizeMenuDraft({ blocks: [null, 3, "x"] }).blocks).toEqual([]);
  });

  it("recorta los textos del hero y del footer a string", () => {
    const [hero] = normalizeMenuDraft({ blocks: [{ type: "hero", data: { title: "  Pizza  " } }] }).blocks;
    expect(hero.data.title).toBe("Pizza");
    expect(hero.data.subtitle).toBe("");
  });
});

describe("normalizeMenuDocument", () => {
  it("reconstruye un documento ausente", () => {
    expect(normalizeMenuDocument(null)).toEqual(createEmptyMenu());
  });

  it("normaliza draft y published por separado", () => {
    const doc = normalizeMenuDocument({
      version: 1,
      draft: { blocks: [heroRaw, { type: "nope" }] },
      published: { blocks: [catRaw("bebidas")] },
      publishedAt: "2026-08-22T10:00:00.000Z",
    });
    expect(doc.draft.blocks).toHaveLength(1);
    expect(doc.published.blocks).toHaveLength(1);
    expect(doc.publishedAt).toBe("2026-08-22T10:00:00.000Z");
  });

  it("siempre sella la version actual", () => {
    expect(normalizeMenuDocument({ version: 99 }).version).toBe(MENU_SCHEMA_VERSION);
  });
});

describe("canPublish", () => {
  it("rechaza un borrador vacio", () => {
    expect(canPublish(createEmptyMenu())).toBe("empty_draft");
  });

  it("rechaza un borrador cuyos bloques son todos invalidos", () => {
    expect(canPublish({ draft: { blocks: [{ type: "nope" }] } })).toBe("empty_draft");
  });

  it("acepta un borrador con al menos un bloque valido", () => {
    expect(canPublish({ draft: { blocks: [heroRaw] } })).toBeNull();
  });
});

describe("publishDraft", () => {
  it("copia el borrador a publicado y sella la fecha inyectada", () => {
    const menu = normalizeMenuDocument({ draft: { blocks: [heroRaw, catRaw("bebidas")] } });
    const published = publishDraft(menu, "2026-08-22T12:00:00.000Z");

    expect(published.published).toEqual(published.draft);
    expect(published.publishedAt).toBe("2026-08-22T12:00:00.000Z");
    expect(published.version).toBe(MENU_SCHEMA_VERSION);
  });

  it("no comparte referencia entre draft y published", () => {
    const menu = normalizeMenuDocument({ draft: { blocks: [heroRaw] } });
    const published = publishDraft(menu, "2026-08-22T12:00:00.000Z");
    published.draft.blocks.push(footerRaw);
    expect(published.published.blocks).toHaveLength(1);
  });
});

describe("referencedCategoryIds", () => {
  it("junta los ids de los bloques de categoria visibles, sin repetir", () => {
    const { blocks } = normalizeMenuDraft({
      blocks: [heroRaw, catRaw("bebidas"), catRaw("postres"), footerRaw],
    });
    expect(referencedCategoryIds(blocks)).toEqual(["bebidas", "postres"]);
  });

  it("ignora los bloques invisibles", () => {
    const { blocks } = normalizeMenuDraft({
      blocks: [{ ...catRaw("bebidas"), visible: false }, catRaw("postres")],
    });
    expect(referencedCategoryIds(blocks)).toEqual(["postres"]);
  });
});

describe("renderableBlocks", () => {
  const categories = new Map([
    ["bebidas", { id: "bebidas", label: "Bebidas", active: true }],
    ["viejo", { id: "viejo", label: "Viejo", active: false }],
  ]);

  it("omite los bloques invisibles", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [{ ...heroRaw, visible: false }, footerRaw] });
    expect(renderableBlocks(blocks, categories).map((b) => b.type)).toEqual(["footer"]);
  });

  it("omite un bloque cuya categoria no existe", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [catRaw("fantasma")] });
    expect(renderableBlocks(blocks, categories)).toEqual([]);
  });

  it("omite un bloque cuya categoria esta inactiva", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [catRaw("viejo")] });
    expect(renderableBlocks(blocks, categories)).toEqual([]);
  });

  it("conserva hero y footer sin importar las categorias", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [heroRaw, footerRaw] });
    expect(renderableBlocks(blocks, new Map()).map((b) => b.type)).toEqual(["hero", "footer"]);
  });

  it("conserva un bloque de categoria activa", () => {
    const { blocks } = normalizeMenuDraft({ blocks: [catRaw("bebidas")] });
    expect(renderableBlocks(blocks, categories)).toHaveLength(1);
  });
});

describe("BLOCK_TYPES", () => {
  it("son exactamente los tres del alcance de 1a", () => {
    expect([...BLOCK_TYPES]).toEqual(["hero", "category", "footer"]);
  });
});
```

- [ ] **Step 2: Correr el test para verificar que falla**

Run: `npm test`
Expected: FAIL — no se puede resolver `@/lib/menu/menuSchema`.

- [ ] **Step 3: Implementar**

Crear `src/app/lib/menu/menuSchema.js`:

```js
// Version del esquema de bloques. Es lo unico que no se puede agregar despues:
// sin ella, migrar un menu ya publicado no tiene punto de apoyo.
export const MENU_SCHEMA_VERSION = 1;

export const BLOCK_TYPES = Object.freeze(["hero", "category", "footer"]);

export const MENU_ERRORS = Object.freeze({
  EMPTY_DRAFT: "empty_draft",
});

const text = (value, max) => String(value ?? "").trim().slice(0, max);

const TEXT_LIMITS = Object.freeze({
  title: 120,
  subtitle: 200,
  footerText: 300,
  phone: 40,
  address: 200,
});

function normalizeBlock(raw, index) {
  const type = String(raw?.type ?? "");
  if (!BLOCK_TYPES.includes(type)) {
    return null;
  }

  const rawId = typeof raw?.id === "string" ? raw.id.trim() : "";
  const id = rawId || `${type}-${index}`;
  const visible = raw?.visible !== false;
  const data = raw?.data ?? {};

  if (type === "hero") {
    return {
      id,
      type,
      visible,
      data: {
        title: text(data.title, TEXT_LIMITS.title),
        subtitle: text(data.subtitle, TEXT_LIMITS.subtitle),
      },
    };
  }

  if (type === "footer") {
    return {
      id,
      type,
      visible,
      data: {
        text: text(data.text, TEXT_LIMITS.footerText),
        phone: text(data.phone, TEXT_LIMITS.phone),
        address: text(data.address, TEXT_LIMITS.address),
      },
    };
  }

  // category: sin categoryId el bloque no referencia nada y no existe.
  const categoryId = text(data.categoryId, 80);
  if (!categoryId) {
    return null;
  }

  return {
    id,
    type,
    visible,
    data: {
      categoryId,
      showPhotos: data.showPhotos !== false,
      showDescriptions: data.showDescriptions !== false,
    },
  };
}

export function normalizeMenuDraft(raw) {
  const source = Array.isArray(raw?.blocks) ? raw.blocks : [];
  const seenCategories = new Set();
  const blocks = [];

  source.forEach((entry, index) => {
    const block = normalizeBlock(entry, index);
    if (!block) {
      return;
    }

    // Una categoria dos veces mostraria sus productos duplicados en el menu.
    if (block.type === "category") {
      if (seenCategories.has(block.data.categoryId)) {
        return;
      }
      seenCategories.add(block.data.categoryId);
    }

    blocks.push(block);
  });

  return { blocks };
}

export function createEmptyMenu() {
  return {
    version: MENU_SCHEMA_VERSION,
    draft: { blocks: [] },
    published: null,
    publishedAt: null,
  };
}

export function normalizeMenuDocument(raw) {
  if (!raw) {
    return createEmptyMenu();
  }

  const publishedRaw = raw.published;

  return {
    version: MENU_SCHEMA_VERSION,
    draft: normalizeMenuDraft(raw.draft),
    published: publishedRaw ? normalizeMenuDraft(publishedRaw) : null,
    publishedAt: typeof raw.publishedAt === "string" ? raw.publishedAt : null,
  };
}

export function canPublish(menu) {
  const draft = normalizeMenuDraft(menu?.draft);
  return draft.blocks.length ? null : MENU_ERRORS.EMPTY_DRAFT;
}

// La fecha entra por parametro para que el resultado sea determinista y testeable.
export function publishDraft(menu, publishedAtIso) {
  const draft = normalizeMenuDraft(menu?.draft);

  return {
    version: MENU_SCHEMA_VERSION,
    draft,
    // Copia estructural: si compartieran referencia, seguir editando el borrador
    // mutaria lo que ya esta publicado.
    published: JSON.parse(JSON.stringify(draft)),
    publishedAt: publishedAtIso,
  };
}

export function referencedCategoryIds(blocks) {
  const ids = [];

  for (const block of Array.isArray(blocks) ? blocks : []) {
    if (block?.type !== "category" || block?.visible === false) {
      continue;
    }
    if (!ids.includes(block.data.categoryId)) {
      ids.push(block.data.categoryId);
    }
  }

  return ids;
}

// Desactivar una categoria en ajustes la saca del menu sin tener que editar el
// menu; una categoria borrada tampoco deja un hueco roto.
export function renderableBlocks(blocks, categoryMap) {
  const categories = categoryMap instanceof Map ? categoryMap : new Map();

  return (Array.isArray(blocks) ? blocks : []).filter((block) => {
    if (!block || block.visible === false) {
      return false;
    }
    if (block.type !== "category") {
      return true;
    }
    const category = categories.get(block.data.categoryId);
    return Boolean(category) && category.active !== false;
  });
}
```

- [ ] **Step 4: Correr el test para verificar que pasa**

Run: `npm test`
Expected: PASS, 26 tests nuevos.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/menu/menuSchema.js src/app/lib/menu/menuSchema.test.js
git commit -m "feat(online-menu): esquema de bloques versionado"
```

---

### Task 4: Persistencia del slug y de la configuración

**Files:**
- Modify: `src/app/models/master/Tenant.js`
- Create: `src/app/lib/menu/menuTenant.js`
- Create: `src/app/lib/menu/menuSettings.js`

**Interfaces:**
- Consumes: `normalizeMenuSlug`, `MENU_SLUG_ERRORS` (Task 2); `normalizeMenuDocument`, `createEmptyMenu` (Task 3).
- Produces:
  - `Tenant.menuSlug` — String, minúsculas, índice `unique` + `sparse`.
  - `findTenantByMenuSlug(masterConn, slug)` → documento `lean()` de la sede activa, o `null`.
  - `assignMenuSlug(masterConn, tenantId, slug)` → `{ ok: true }` o `{ ok: false, error: 'slug_taken' }`.
  - `MENU_SETTING_DESCRIPTION = 'Online Menu'`.
  - `readMenuDocument(conn)` → documento normalizado (nunca `null`).
  - `writeMenuDocument(conn, document)` → documento guardado.

- [ ] **Step 1: Agregar el campo al modelo**

En `src/app/models/master/Tenant.js`, dentro de `TenantSchema`, después del campo `features`:

```js
  // Slug del menu publico (/m/<slug>). Vive aca y no en la base de la sede
  // porque resolver el link tiene que pasar antes de saber a que base conectarse.
  // `sparse` es necesario: sin el, todas las sedes sin menu colisionarian en null
  // contra el indice unico.
  menuSlug: {
    type: String,
    default: null,
    lowercase: true,
    trim: true,
    unique: true,
    sparse: true,
  },
```

- [ ] **Step 2: Crear el acceso al master**

Crear `src/app/lib/menu/menuTenant.js`:

```js
import { TenantModel } from '@/models/master/Tenant';
import { MENU_SLUG_ERRORS, normalizeMenuSlug } from '@/lib/menu/menuSlug';

// Resolucion del link publico. Solo sedes activas: una sede dada de baja no
// debe seguir sirviendo su menu.
export async function findTenantByMenuSlug(masterConn, slug) {
  const normalized = normalizeMenuSlug(slug);
  if (!normalized) {
    return null;
  }

  const Tenant = TenantModel(masterConn);
  return Tenant.findOne({ menuSlug: normalized, status: 'active' }).lean();
}

export async function assignMenuSlug(masterConn, tenantId, slug) {
  const Tenant = TenantModel(masterConn);
  const normalized = normalizeMenuSlug(slug);

  try {
    await Tenant.updateOne(
      { tenantId: String(tenantId) },
      { $set: { menuSlug: normalized } },
    );
    return { ok: true };
  } catch (error) {
    // 11000 es la violacion del indice unico: el slug ya lo tiene otra sede.
    if (error?.code === 11000) {
      return { ok: false, error: MENU_SLUG_ERRORS.TAKEN };
    }
    throw error;
  }
}
```

- [ ] **Step 3: Crear el acceso a la configuración**

Crear `src/app/lib/menu/menuSettings.js`:

```js
import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import { createEmptyMenu, normalizeMenuDocument } from '@/lib/menu/menuSchema';

export const MENU_SETTING_DESCRIPTION = 'Online Menu';

// Devuelve siempre un documento valido: una sede que nunca abrio el editor no
// tiene la fila, y el resto del codigo no deberia tener que saberlo.
export async function readMenuDocument(conn) {
  const TenantSetting = TenantSettingModel(conn);
  const row = await TenantSetting.findOne({
    description: MENU_SETTING_DESCRIPTION,
  }).lean();

  return row?.data ? normalizeMenuDocument(row.data) : createEmptyMenu();
}

export async function writeMenuDocument(conn, document) {
  const TenantSetting = TenantSettingModel(conn);
  const normalized = normalizeMenuDocument(document);

  await TenantSetting.updateOne(
    { description: MENU_SETTING_DESCRIPTION },
    { $set: { data: normalized } },
    { upsert: true },
  );

  return normalized;
}
```

- [ ] **Step 4: Verificar**

Run: `npm test && npx eslint --no-cache src && npm run build`
Expected: tests siguen en el total de las tareas 1-3; ESLint en 11 problemas; build exitoso.

Verificación del modelo, sin base de datos: confirma que el índice quedó `unique` **y** `sparse`, que es el detalle que rompe todo si falta.

```bash
node --input-type=module -e "
const mongoose = (await import('mongoose')).default;
const { TenantModel } = await import('./src/app/models/master/Tenant.js');
const conn = new mongoose.Mongoose();
const Tenant = TenantModel(conn);
const path = Tenant.schema.path('menuSlug');
console.log('existe menuSlug?', Boolean(path));
console.log('lowercase?', path.options.lowercase === true);
console.log('unique?', path.options.unique === true);
console.log('sparse?', path.options.sparse === true);
const doc = new Tenant({ tenantId:'1', name:'x', dbName:'d', plan:'p', internalDomain:'i' });
console.log('valida sin menuSlug?', doc.validateSync() === undefined);
const upper = new Tenant({ tenantId:'1', name:'x', dbName:'d', plan:'p', internalDomain:'i', menuSlug:'  Pizzeria-Luigi  ' });
console.log('normaliza a minusculas y recorta?', upper.menuSlug === 'pizzeria-luigi');
"
```
Expected: las cinco líneas en `true`.

- [ ] **Step 5: Commit**

```bash
git add src/app/models/master/Tenant.js src/app/lib/menu/menuTenant.js src/app/lib/menu/menuSettings.js
git commit -m "feat(online-menu): persistencia del slug y de la configuracion"
```

---

### Task 5: Endpoints de lectura y guardado

**Files:**
- Create: `src/app/api/company/sedes/[tenantId]/menu/route.js`

**Interfaces:**
- Consumes: `getOwnerContext` de `@/lib/auth/ownerAuth`; `connectMasterDB` de `@/lib/db/master`; `getTenantConnection` de `@/lib/db/connections`; `TenantModel`; `hasFeature` del registro; Tasks 2, 3 y 4.
- Produces:
  - `GET /api/company/sedes/[tenantId]/menu` → `{ tenant: { tenantId, name, sedeLabel }, menuSlug, menu }`.
  - `PUT /api/company/sedes/[tenantId]/menu` → mismo cuerpo, tras guardar. Acepta `{ menuSlug, draft }`.

- [ ] **Step 1: Escribir el handler**

Crear `src/app/api/company/sedes/[tenantId]/menu/route.js`:

```js
import { NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantModel } from '@/models/master/Tenant';
import { hasFeature } from '@/lib/features/featureRegistry';
import { MENU_SLUG_ERRORS, normalizeMenuSlug, validateMenuSlug } from '@/lib/menu/menuSlug';
import { normalizeMenuDraft, normalizeMenuDocument } from '@/lib/menu/menuSchema';
import { assignMenuSlug } from '@/lib/menu/menuTenant';
import { readMenuDocument, writeMenuDocument } from '@/lib/menu/menuSettings';

// El token del dueño no lleva tenantId, asi que la pertenencia de la sede se
// verifica siempre contra el master y nunca contra un dato del cliente.
async function resolveOwnerSede(masterConn, companyId, tenantId) {
  const Tenant = TenantModel(masterConn);
  return Tenant.findOne({
    tenantId: String(tenantId),
    companyId,
    status: 'active',
  }).lean();
}

function sedeSummary(sede) {
  return {
    tenantId: sede.tenantId,
    name: sede.name,
    sedeLabel: sede.sedeLabel || null,
  };
}

const errorResponse = (error, fallback) => {
  const status = error?.status || 500;
  return NextResponse.json(
    { error: status === 500 ? fallback : error.message },
    { status },
  );
};

export async function GET(req, { params }) {
  try {
    const { companyId } = await getOwnerContext(req);
    const { tenantId } = await params;

    const masterConn = await connectMasterDB();
    const sede = await resolveOwnerSede(masterConn, companyId, tenantId);
    if (!sede) {
      return NextResponse.json({ error: 'Sede not available' }, { status: 403 });
    }
    if (!hasFeature(sede.features, 'online-menu')) {
      return NextResponse.json({ error: 'feature_not_included' }, { status: 403 });
    }

    const conn = await getTenantConnection(sede.dbName);
    const menu = await readMenuDocument(conn);

    return NextResponse.json({
      tenant: sedeSummary(sede),
      menuSlug: sede.menuSlug || '',
      menu,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to load menu');
  }
}

export async function PUT(req, { params }) {
  try {
    const { companyId } = await getOwnerContext(req);
    const { tenantId } = await params;

    const masterConn = await connectMasterDB();
    const sede = await resolveOwnerSede(masterConn, companyId, tenantId);
    if (!sede) {
      return NextResponse.json({ error: 'Sede not available' }, { status: 403 });
    }
    if (!hasFeature(sede.features, 'online-menu')) {
      return NextResponse.json({ error: 'feature_not_included' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const slugError = validateMenuSlug(body?.menuSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    const assigned = await assignMenuSlug(masterConn, sede.tenantId, body.menuSlug);
    if (!assigned.ok) {
      return NextResponse.json({ error: assigned.error }, { status: 409 });
    }

    const conn = await getTenantConnection(sede.dbName);
    const current = await readMenuDocument(conn);
    const saved = await writeMenuDocument(conn, {
      ...current,
      draft: normalizeMenuDraft(body?.draft),
    });

    return NextResponse.json({
      tenant: sedeSummary(sede),
      menuSlug: normalizeMenuSlug(body.menuSlug),
      menu: normalizeMenuDocument(saved),
    });
  } catch (error) {
    return errorResponse(error, 'Failed to save menu');
  }
}
```

- [ ] **Step 2: Verificar**

Run: `npx eslint --no-cache src && npm run build`
Expected: ESLint en 11 problemas y ninguno nuevo; build exitoso, con `ƒ /api/company/sedes/[tenantId]/menu` en la lista de rutas. Confirmar que esa línea aparece y citarla en el reporte.


- [ ] **Step 3: Commit**

```bash
git add "src/app/api/company/sedes/[tenantId]/menu/route.js"
git commit -m "feat(online-menu): endpoints de lectura y guardado del menu"
```

---

### Task 6: Endpoint de publicación

**Files:**
- Create: `src/app/api/company/sedes/[tenantId]/menu/publish/route.js`

**Interfaces:**
- Consumes: lo mismo que Task 5, más `canPublish` y `publishDraft` (Task 3) y `revalidatePath` de `next/cache`.
- Produces: `POST /api/company/sedes/[tenantId]/menu/publish` → `{ menu, revalidated: [rutas] }`.

- [ ] **Step 1: Escribir el handler**

Crear `src/app/api/company/sedes/[tenantId]/menu/publish/route.js`:

```js
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantModel } from '@/models/master/Tenant';
import { hasFeature } from '@/lib/features/featureRegistry';
import { canPublish, publishDraft } from '@/lib/menu/menuSchema';
import { readMenuDocument, writeMenuDocument } from '@/lib/menu/menuSettings';

async function resolveOwnerSede(masterConn, companyId, tenantId) {
  const Tenant = TenantModel(masterConn);
  return Tenant.findOne({
    tenantId: String(tenantId),
    companyId,
    status: 'active',
  }).lean();
}

export async function POST(req, { params }) {
  try {
    const { companyId } = await getOwnerContext(req);
    const { tenantId } = await params;

    const masterConn = await connectMasterDB();
    const sede = await resolveOwnerSede(masterConn, companyId, tenantId);
    if (!sede) {
      return NextResponse.json({ error: 'Sede not available' }, { status: 403 });
    }
    if (!hasFeature(sede.features, 'online-menu')) {
      return NextResponse.json({ error: 'feature_not_included' }, { status: 403 });
    }
    if (!sede.menuSlug) {
      return NextResponse.json({ error: 'slug_missing' }, { status: 400 });
    }

    const conn = await getTenantConnection(sede.dbName);
    const current = await readMenuDocument(conn);

    const blocked = canPublish(current);
    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 400 });
    }

    const published = await writeMenuDocument(
      conn,
      publishDraft(current, new Date().toISOString()),
    );

    // Publicar tiene que invalidar la cache de la pagina publica, o el visitante
    // seguiria viendo la version anterior hasta que expire el revalidate.
    const routes = [`/m/${sede.menuSlug}`];
    for (const route of routes) {
      revalidatePath(route);
    }

    return NextResponse.json({ menu: published, revalidated: routes });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to publish menu' : error.message },
      { status },
    );
  }
}
```

- [ ] **Step 2: Revalidar también el slug anterior cuando cambia**

Cambiar el slug deja la ruta vieja sirviendo el menú desde la caché. En `src/app/api/company/sedes/[tenantId]/menu/route.js` (el `PUT` de la Task 5), agregar el import:

```js
import { revalidatePath } from 'next/cache';
```

Y justo después de la llamada a `assignMenuSlug` que devolvió `ok`, antes de tocar la configuración:

```js
    // El slug viejo queda apuntando a una ruta que ya no existe: si no se
    // revalida, sigue sirviendo el menu desde la cache.
    const previousSlug = sede.menuSlug || '';
    const nextSlug = normalizeMenuSlug(body.menuSlug);
    if (previousSlug && previousSlug !== nextSlug) {
      revalidatePath(`/m/${previousSlug}`);
    }
    revalidatePath(`/m/${nextSlug}`);
```

- [ ] **Step 3: Verificar**

Run: `npx eslint --no-cache src && npm run build`
Expected: ESLint en 11 problemas; build exitoso con `ƒ /api/company/sedes/[tenantId]/menu/publish` en la lista. Citar esa línea en el reporte.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/company/sedes/[tenantId]/menu"
git commit -m "feat(online-menu): publicar el menu y revalidar la ruta publica"
```

---

### Task 7: Página pública y matcher del middleware

**Files:**
- Modify: `src/middleware.js`
- Create: `src/app/m/[slug]/page.jsx`
- Create: `src/app/m/[slug]/menu-blocks.jsx`

**Interfaces:**
- Consumes: `findTenantByMenuSlug` (Task 4); `readMenuDocument` (Task 4); `renderableBlocks`, `referencedCategoryIds` (Task 3); `getProductCategoryMap` de `@/lib/tenant/categorySettings`; `getSystemSettings` de `@/lib/tenant/systemSettings`; `formatCurrencyAmount` de `@/lib/formatCurrencyAmount`; `ProductModel`; `hasFeature`.
- Produces: la ruta pública. Nada que consuman otras tareas.

- [ ] **Step 1: Sacar `/m` del middleware**

En `src/middleware.js`, reemplazar el `config` del final del archivo:

```js
export const config = {
  // `m` queda fuera a proposito: es la ruta del menu publico. No alcanza con
  // marcarla publica en routeDefinitions, porque intlMiddleware corre en la
  // primera linea del middleware y la redirigiria a /es/m/<slug>, que no sirve
  // para imprimir en un QR.
  matcher: ['/((?!api|m|_next|favicon.ico|.*\\..*).*)'],
};
```

- [ ] **Step 2: Escribir los componentes de bloque**

Crear `src/app/m/[slug]/menu-blocks.jsx`:

```jsx
import Image from "next/image";

export function HeroBlock({ data }) {
  if (!data.title && !data.subtitle) {
    return null;
  }

  return (
    <header className="border-b border-neutral-200 px-5 py-10 text-center">
      {data.title ? (
        <h1 className="text-3xl font-bold tracking-tight text-neutral-900">{data.title}</h1>
      ) : null}
      {data.subtitle ? (
        <p className="mt-2 text-sm text-neutral-500">{data.subtitle}</p>
      ) : null}
    </header>
  );
}

export function CategoryBlock({ label, products, showPhotos, showDescriptions, formatPrice }) {
  if (!products.length) {
    return null;
  }

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <ul className="space-y-4">
        {products.map((product) => (
          <li key={product.id} className="flex gap-4">
            {showPhotos && product.image?.url ? (
              <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100">
                <Image
                  src={product.image.url}
                  alt={product.name}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <p className="font-medium text-neutral-900">{product.name}</p>
                <p className="shrink-0 font-semibold text-neutral-900 tabular-nums">
                  {formatPrice(product.price)}
                </p>
              </div>
              {showDescriptions && product.description ? (
                <p className="mt-1 text-sm text-neutral-500">{product.description}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function FooterBlock({ data }) {
  if (!data.text && !data.phone && !data.address) {
    return null;
  }

  return (
    <footer className="border-t border-neutral-200 px-5 py-8 text-center text-sm text-neutral-500">
      {data.text ? <p>{data.text}</p> : null}
      {data.address ? <p className="mt-1">{data.address}</p> : null}
      {data.phone ? (
        <p className="mt-1">
          <a className="underline" href={`tel:${data.phone}`}>{data.phone}</a>
        </p>
      ) : null}
    </footer>
  );
}
```

- [ ] **Step 3: Escribir la página**

Crear `src/app/m/[slug]/page.jsx`:

```jsx
import { notFound } from "next/navigation";
import { connectMasterDB } from "@/lib/db/master";
import { getTenantConnection } from "@/lib/db/connections";
import { ProductModel } from "@/models/tenant/Product";
import { hasFeature } from "@/lib/features/featureRegistry";
import { findTenantByMenuSlug } from "@/lib/menu/menuTenant";
import { readMenuDocument } from "@/lib/menu/menuSettings";
import { referencedCategoryIds, renderableBlocks } from "@/lib/menu/menuSchema";
import { getProductCategoryMap } from "@/lib/tenant/categorySettings";
import { getSystemSettings } from "@/lib/tenant/systemSettings";
import { formatCurrencyAmount } from "@/lib/formatCurrencyAmount";
import { defaultLocale } from "../../../../i18n";
import { CategoryBlock, FooterBlock, HeroBlock } from "./menu-blocks";

// Cacheada un minuto. Los precios cambian en el modulo de productos, no al
// publicar el menu, asi que revalidar solo al publicar dejaria precios viejos
// para siempre. Y una mesa entera escaneando el QR a la vez recibe el mismo HTML
// sin tocar la base.
export const revalidate = 60;

export default async function PublicMenuPage({ params }) {
  const { slug } = await params;

  const masterConn = await connectMasterDB();
  const tenant = await findTenantByMenuSlug(masterConn, slug);

  // Slug desconocido, sede inactiva y feature no contratado dan todos 404, sin
  // distinguirse: el link no sirve para averiguar que sedes existen ni quien
  // dejo de pagar. Y sin el chequeo de feature, un menu publicado seguiria vivo
  // despues de que el cliente deje de pagar el modulo.
  if (!tenant || !hasFeature(tenant.features, "online-menu")) {
    notFound();
  }

  const conn = await getTenantConnection(tenant.dbName);
  const menu = await readMenuDocument(conn);

  if (!menu.published?.blocks?.length) {
    notFound();
  }

  const [categoryMap, settings] = await Promise.all([
    getProductCategoryMap(conn),
    getSystemSettings(conn),
  ]);

  const blocks = renderableBlocks(menu.published.blocks, categoryMap);
  if (!blocks.length) {
    notFound();
  }

  // Una sola consulta para todas las categorias: un menu de ocho secciones no
  // debe costar ocho viajes a la base.
  const categoryIds = referencedCategoryIds(blocks);
  const products = categoryIds.length
    ? await ProductModel(conn)
        .find({ categoryId: { $in: categoryIds } })
        .select("name price description image categoryId")
        .sort({ name: 1 })
        .lean()
    : [];

  const productsByCategory = new Map();
  for (const product of products) {
    const key = String(product.categoryId ?? "");
    if (!productsByCategory.has(key)) {
      productsByCategory.set(key, []);
    }
    productsByCategory.get(key).push({
      id: String(product._id),
      name: product.name,
      price: product.price,
      description: product.description || "",
      image: product.image?.url ? { url: product.image.url } : null,
    });
  }

  const formatPrice = (amount) =>
    formatCurrencyAmount(amount, settings?.currency, defaultLocale);

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-neutral-900">
      {blocks.map((block) => {
        if (block.type === "hero") {
          return <HeroBlock key={block.id} data={block.data} />;
        }

        if (block.type === "footer") {
          return <FooterBlock key={block.id} data={block.data} />;
        }

        return (
          <CategoryBlock
            key={block.id}
            label={categoryMap.get(block.data.categoryId)?.label ?? ""}
            products={productsByCategory.get(block.data.categoryId) ?? []}
            showPhotos={block.data.showPhotos}
            showDescriptions={block.data.showDescriptions}
            formatPrice={formatPrice}
          />
        );
      })}
    </main>
  );
}
```

- [ ] **Step 4: Verificar**

Run: `npx eslint --no-cache src && npm run build`
Expected: ESLint en 11 problemas y ninguno nuevo; build exitoso con `ƒ /m/[slug]` en la lista de rutas. Citar esa línea.

Confirmar que el middleware ya no toca `/m`:

```bash
node --input-type=module -e "
const re = new RegExp('^/((?!api|m|_next|favicon.ico|.*\\\\..*).*)\$');
for (const p of ['/m/pizzeria','/es/orders/123','/api/products','/login','/es/login']) {
  console.log(p.padEnd(20), re.test(p) ? 'PASA POR MIDDLEWARE' : 'excluida');
}
"
```
Expected: `/m/pizzeria` → `excluida`; `/es/orders/123` y `/es/login` → `PASA POR MIDDLEWARE`; `/api/products` → `excluida`.

- [ ] **Step 5: Commit**

```bash
git add src/middleware.js "src/app/m"
git commit -m "feat(online-menu): pagina publica /m/<slug> cacheada"
```

---

### Task 8: Formulario del editor y acceso desde el panel

**Files:**
- Create: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`
- Modify: `src/app/[locale]/admin/[companyId]/page.jsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: los endpoints de las Tasks 5 y 6.
- Produces: nada que consuman otras tareas.

- [ ] **Step 1: Agregar los textos**

En `messages/es.json`, como namespace nuevo de primer nivel `OnlineMenu`:

```json
"OnlineMenu": {
  "title": "Menú en línea",
  "backToPanel": "Volver al panel",
  "linkLabel": "Enlace público",
  "linkHint": "Solo minúsculas, números y guiones. Entre 3 y 40 caracteres.",
  "linkWarning": "Si cambiás el enlace, los códigos QR ya impresos dejan de funcionar.",
  "openPublic": "Ver menú público",
  "heroTitle": "Portada",
  "heroTitleField": "Título",
  "heroSubtitleField": "Subtítulo",
  "footerTitle": "Pie",
  "footerTextField": "Texto",
  "footerPhoneField": "Teléfono",
  "footerAddressField": "Dirección",
  "categoriesTitle": "Categorías",
  "categoriesHint": "Solo las categorías marcadas aparecen en el menú. Una categoría nueva no se agrega sola.",
  "noCategories": "Esta sede no tiene categorías activas todavía.",
  "include": "Incluir",
  "order": "Orden",
  "showPhotos": "Fotos",
  "showDescriptions": "Descripciones",
  "saveDraft": "Guardar borrador",
  "saving": "Guardando...",
  "publish": "Publicar",
  "publishing": "Publicando...",
  "draftSaved": "Borrador guardado.",
  "published": "Menú publicado.",
  "neverPublished": "Sin publicar todavía.",
  "publishedAt": "Publicado el {date}",
  "loading": "Cargando...",
  "loadError": "No se pudo cargar el menú.",
  "saveError": "No se pudo guardar el menú.",
  "publishError": "No se pudo publicar el menú.",
  "error_slug_too_short": "El enlace es demasiado corto.",
  "error_slug_too_long": "El enlace es demasiado largo.",
  "error_slug_invalid": "El enlace solo admite minúsculas, números y guiones, sin guiones al inicio, al final ni repetidos.",
  "error_slug_taken": "Ese enlace ya está en uso por otra sede.",
  "error_slug_missing": "Definí un enlace antes de publicar.",
  "error_empty_draft": "El menú no tiene bloques para publicar.",
  "error_feature_not_included": "Esta sede no tiene el módulo de menú en línea."
}
```

En `messages/en.json`, el mismo namespace con las mismas claves:

```json
"OnlineMenu": {
  "title": "Online menu",
  "backToPanel": "Back to panel",
  "linkLabel": "Public link",
  "linkHint": "Lowercase letters, numbers and hyphens only. Between 3 and 40 characters.",
  "linkWarning": "Changing the link breaks any QR codes already printed.",
  "openPublic": "View public menu",
  "heroTitle": "Header",
  "heroTitleField": "Title",
  "heroSubtitleField": "Subtitle",
  "footerTitle": "Footer",
  "footerTextField": "Text",
  "footerPhoneField": "Phone",
  "footerAddressField": "Address",
  "categoriesTitle": "Categories",
  "categoriesHint": "Only checked categories appear on the menu. A new category is not added automatically.",
  "noCategories": "This location has no active categories yet.",
  "include": "Include",
  "order": "Order",
  "showPhotos": "Photos",
  "showDescriptions": "Descriptions",
  "saveDraft": "Save draft",
  "saving": "Saving...",
  "publish": "Publish",
  "publishing": "Publishing...",
  "draftSaved": "Draft saved.",
  "published": "Menu published.",
  "neverPublished": "Not published yet.",
  "publishedAt": "Published on {date}",
  "loading": "Loading...",
  "loadError": "Could not load the menu.",
  "saveError": "Could not save the menu.",
  "publishError": "Could not publish the menu.",
  "error_slug_too_short": "The link is too short.",
  "error_slug_too_long": "The link is too long.",
  "error_slug_invalid": "The link only accepts lowercase letters, numbers and hyphens, with no leading, trailing or repeated hyphens.",
  "error_slug_taken": "That link is already used by another location.",
  "error_slug_missing": "Set a link before publishing.",
  "error_empty_draft": "The menu has no blocks to publish.",
  "error_feature_not_included": "This location does not have the online menu module."
}
```

- [ ] **Step 2: Escribir el formulario**

Crear `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`:

```jsx
"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";

const EMPTY_HERO = { title: "", subtitle: "" };
const EMPTY_FOOTER = { text: "", phone: "", address: "" };

// Los errores del servidor llegan como codigos y se traducen aca, para que el
// servidor no imponga el idioma de la interfaz.
const useErrorText = (t) => (code, fallbackKey) => {
  const key = `error_${code}`;
  return t.has(key) ? t(key) : t(fallbackKey);
};

export default function OnlineMenuEditorPage() {
  const t = useTranslations("OnlineMenu");
  const params = useParams();
  const locale = String(params?.locale ?? "");
  const companyId = String(params?.companyId ?? "");
  const tenantId = String(params?.tenantId ?? "");
  const errorText = useErrorText(t);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [alert, setAlert] = useState(null);

  const [slug, setSlug] = useState("");
  const [hero, setHero] = useState(EMPTY_HERO);
  const [footer, setFooter] = useState(EMPTY_FOOTER);
  const [categories, setCategories] = useState([]);
  const [publishedAt, setPublishedAt] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [menuRes, categoriesRes] = await Promise.all([
        fetch(`/api/company/sedes/${tenantId}/menu`),
        fetch(`/api/company/sedes/${tenantId}/menu/categories`),
      ]);

      const menuBody = await menuRes.json().catch(() => ({}));
      if (!menuRes.ok) {
        setAlert({ type: "error", message: errorText(menuBody?.error, "loadError") });
        return;
      }

      const categoryBody = await categoriesRes.json().catch(() => ({}));
      const activeCategories = Array.isArray(categoryBody?.categories)
        ? categoryBody.categories
        : [];

      const blocks = menuBody.menu?.draft?.blocks ?? [];
      const heroBlock = blocks.find((b) => b.type === "hero");
      const footerBlock = blocks.find((b) => b.type === "footer");
      const categoryBlocks = blocks.filter((b) => b.type === "category");

      setSlug(menuBody.menuSlug ?? "");
      setHero(heroBlock ? { ...EMPTY_HERO, ...heroBlock.data } : EMPTY_HERO);
      setFooter(footerBlock ? { ...EMPTY_FOOTER, ...footerBlock.data } : EMPTY_FOOTER);
      setPublishedAt(menuBody.menu?.publishedAt ?? null);
      setCategories(
        activeCategories.map((category) => {
          const index = categoryBlocks.findIndex((b) => b.data.categoryId === category.id);
          const block = index >= 0 ? categoryBlocks[index] : null;
          return {
            id: category.id,
            label: category.label ?? category.id,
            included: Boolean(block),
            order: index >= 0 ? index + 1 : activeCategories.length,
            showPhotos: block ? block.data.showPhotos : true,
            showDescriptions: block ? block.data.showDescriptions : true,
          };
        })
      );
      setAlert(null);
    } catch {
      setAlert({ type: "error", message: t("loadError") });
    } finally {
      setLoading(false);
    }
  }, [tenantId, t, errorText]);

  useEffect(() => {
    load();
  }, [load]);

  const buildDraft = () => ({
    blocks: [
      { id: "hero", type: "hero", visible: true, data: hero },
      ...categories
        .filter((category) => category.included)
        .sort((a, b) => a.order - b.order)
        .map((category) => ({
          id: `category-${category.id}`,
          type: "category",
          visible: true,
          data: {
            categoryId: category.id,
            showPhotos: category.showPhotos,
            showDescriptions: category.showDescriptions,
          },
        })),
      { id: "footer", type: "footer", visible: true, data: footer },
    ],
  });

  const saveDraft = async () => {
    setSaving(true);
    setAlert(null);
    try {
      const res = await fetch(`/api/company/sedes/${tenantId}/menu`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuSlug: slug, draft: buildDraft() }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAlert({ type: "error", message: errorText(body?.error, "saveError") });
        return false;
      }
      setAlert({ type: "success", message: t("draftSaved") });
      return true;
    } catch {
      setAlert({ type: "error", message: t("saveError") });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const publish = async () => {
    // Publicar guarda primero: publicar un borrador que quedo sin guardar
    // publicaria la version anterior, que es lo contrario de lo que el boton dice.
    const saved = await saveDraft();
    if (!saved) {
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(`/api/company/sedes/${tenantId}/menu/publish`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setAlert({ type: "error", message: errorText(body?.error, "publishError") });
        return;
      }
      setPublishedAt(body?.menu?.publishedAt ?? null);
      setAlert({ type: "success", message: t("published") });
    } catch {
      setAlert({ type: "error", message: t("publishError") });
    } finally {
      setPublishing(false);
    }
  };

  const busy = saving || publishing;

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 dark:bg-[#061426] dark:text-slate-100">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between gap-4">
          <Link
            href={`/${locale}/admin/${companyId}`}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-blue-500"
          >
            <ArrowLeft className="size-4" /> {t("backToPanel")}
          </Link>
          {slug ? (
            <a
              href={`/m/${slug}`}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm font-medium text-blue-500 hover:underline"
            >
              {t("openPublic")} <ExternalLink className="size-3.5" />
            </a>
          ) : null}
        </div>

        <h1 className="text-2xl font-bold">{t("title")}</h1>

        {loading ? (
          <p className="flex items-center gap-2 text-slate-400">
            <Loader2 className="size-4 animate-spin" /> {t("loading")}
          </p>
        ) : (
          <>
            {alert ? (
              <div
                className={`rounded-lg border p-3 text-sm ${
                  alert.type === "error"
                    ? "border-red-500/30 bg-red-500/10 text-red-500"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
                }`}
              >
                {alert.message}
              </div>
            ) : null}

            <section className="space-y-2 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
              <label className="block text-sm font-semibold" htmlFor="menu-slug">
                {t("linkLabel")}
              </label>
              <div className="flex items-center gap-1">
                <span className="text-sm text-slate-400">/m/</span>
                <input
                  id="menu-slug"
                  value={slug}
                  onChange={(event) => setSlug(event.target.value)}
                  className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
                  placeholder="pizzeria-luigi"
                />
              </div>
              <p className="text-xs text-slate-500">{t("linkHint")}</p>
              <p className="text-xs font-medium text-amber-600">{t("linkWarning")}</p>
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("heroTitle")}
              </h2>
              <input
                value={hero.title}
                onChange={(event) => setHero({ ...hero, title: event.target.value })}
                placeholder={t("heroTitleField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
              <input
                value={hero.subtitle}
                onChange={(event) => setHero({ ...hero, subtitle: event.target.value })}
                placeholder={t("heroSubtitleField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("categoriesTitle")}
              </h2>
              <p className="text-xs text-slate-500">{t("categoriesHint")}</p>
              {categories.length === 0 ? (
                <p className="text-sm text-slate-400">{t("noCategories")}</p>
              ) : (
                <ul className="space-y-2">
                  {categories.map((category, index) => (
                    <li
                      key={category.id}
                      className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-800"
                    >
                      <label className="flex items-center gap-2 text-sm font-medium">
                        <input
                          type="checkbox"
                          checked={category.included}
                          onChange={(event) => {
                            const next = [...categories];
                            next[index] = { ...category, included: event.target.checked };
                            setCategories(next);
                          }}
                        />
                        {category.label}
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        {t("order")}
                        <input
                          type="number"
                          min="1"
                          value={category.order}
                          onChange={(event) => {
                            const next = [...categories];
                            next[index] = { ...category, order: Number(event.target.value) || 1 };
                            setCategories(next);
                          }}
                          className="w-16 rounded-md border border-slate-300 px-2 py-1 dark:border-slate-700 dark:bg-transparent"
                        />
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={category.showPhotos}
                          onChange={(event) => {
                            const next = [...categories];
                            next[index] = { ...category, showPhotos: event.target.checked };
                            setCategories(next);
                          }}
                        />
                        {t("showPhotos")}
                      </label>
                      <label className="flex items-center gap-1 text-xs text-slate-500">
                        <input
                          type="checkbox"
                          checked={category.showDescriptions}
                          onChange={(event) => {
                            const next = [...categories];
                            next[index] = { ...category, showDescriptions: event.target.checked };
                            setCategories(next);
                          }}
                        />
                        {t("showDescriptions")}
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
                {t("footerTitle")}
              </h2>
              <input
                value={footer.text}
                onChange={(event) => setFooter({ ...footer, text: event.target.value })}
                placeholder={t("footerTextField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
              <input
                value={footer.address}
                onChange={(event) => setFooter({ ...footer, address: event.target.value })}
                placeholder={t("footerAddressField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
              <input
                value={footer.phone}
                onChange={(event) => setFooter({ ...footer, phone: event.target.value })}
                placeholder={t("footerPhoneField")}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent"
              />
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                {publishedAt
                  ? t("publishedAt", { date: new Date(publishedAt).toLocaleString() })
                  : t("neverPublished")}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={busy}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium disabled:opacity-50 dark:border-slate-700"
                >
                  {saving ? t("saving") : t("saveDraft")}
                </button>
                <button
                  type="button"
                  onClick={publish}
                  disabled={busy}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                >
                  {publishing ? t("publishing") : t("publish")}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Agregar el endpoint de categorías que el formulario consume**

El formulario pide `/api/company/sedes/[tenantId]/menu/categories`, que todavía no existe. Crear `src/app/api/company/sedes/[tenantId]/menu/categories/route.js`:

```js
import { NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantModel } from '@/models/master/Tenant';
import { hasFeature } from '@/lib/features/featureRegistry';
import { getProductCategories } from '@/lib/tenant/categorySettings';

// El editor vive en el panel del dueño, que no tiene sesion de sede, asi que no
// puede reusar /api/settings: necesita su propia lectura company-scoped.
export async function GET(req, { params }) {
  try {
    const { companyId } = await getOwnerContext(req);
    const { tenantId } = await params;

    const masterConn = await connectMasterDB();
    const sede = await TenantModel(masterConn)
      .findOne({ tenantId: String(tenantId), companyId, status: 'active' })
      .lean();

    if (!sede) {
      return NextResponse.json({ error: 'Sede not available' }, { status: 403 });
    }
    if (!hasFeature(sede.features, 'online-menu')) {
      return NextResponse.json({ error: 'feature_not_included' }, { status: 403 });
    }

    const conn = await getTenantConnection(sede.dbName);
    const categories = await getProductCategories(conn);

    return NextResponse.json({
      categories: categories
        .filter((category) => category?.id && category.active !== false)
        .map((category) => ({ id: String(category.id), label: category.label ?? String(category.id) })),
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to load categories' : error.message },
      { status },
    );
  }
}
```

- [ ] **Step 4: Agregar el botón "Menú" en la fila de sede**

En `src/app/[locale]/admin/[companyId]/page.jsx`, dentro de `SedeCard`, en el `div` de botones y antes del botón `manageUsers`, agregar:

```jsx
          {sede.features?.includes("online-menu") ? (
            <Link
              href={`/${locale}/admin/${companyId}/menu/${sede.tenantId}`}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium transition hover:border-blue-500 dark:border-slate-700"
            >
              {tMenu("title")}
            </Link>
          ) : null}
```

Para que eso compile hacen falta tres cosas en el mismo archivo:

1. Importar `Link`: `import Link from "next/link";`
2. En `SedeCard`, agregar `const tMenu = useTranslations("OnlineMenu");` junto al `const t = useTranslations("AdminPanel");` que ya está.
3. `SedeCard` recibe `locale` pero no `companyId`. Cambiar su firma a
   `function SedeCard({ sede, locale, companyId, onEnter })` y la invocación a
   `<SedeCard key={sede.tenantId} sede={sede} locale={locale} companyId={companyId} onEnter={enterSede} />`.

- [ ] **Step 5: Verificar la paridad de claves entre locales**

Un locale al que le falta una clave es un error en tiempo de ejecución en ese idioma, no un warning.

```bash
node -e "
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) =>
  v && typeof v === 'object' && !Array.isArray(v) ? flat(v, p + k + '.') : [p + k]);
const es = new Set(flat(require('./messages/es.json')));
const en = new Set(flat(require('./messages/en.json')));
const soloEs = [...es].filter(k => !en.has(k));
const soloEn = [...en].filter(k => !es.has(k));
console.log('es:', es.size, 'en:', en.size);
console.log('solo en es:', soloEs.join(', ') || 'ninguna');
console.log('solo en en:', soloEn.join(', ') || 'ninguna');
"
```
Expected: los dos totales iguales, y las dos listas en `ninguna`.

- [ ] **Step 6: Verificar**

Run: `npm test && npx eslint --no-cache src && npm run build`
Expected: tests PASS; ESLint en 11 problemas y ninguno nuevo; build exitoso, con `ƒ /[locale]/admin/[companyId]/menu/[tenantId]` y `ƒ /api/company/sedes/[tenantId]/menu/categories` en la lista de rutas. Citar las dos líneas.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/admin" "src/app/api/company/sedes" messages
git commit -m "feat(online-menu): formulario del editor en el panel del dueno"
```

---

## Verificación final

```bash
npm test && npx eslint --no-cache src && npm run build
```

Expected:
- Tests: PASS. 27 preexistentes del sub-proyecto 0, más 9 del registro (Task 1), 9 del slug (Task 2) y 26 del esquema (Task 3): **71 tests**.
- ESLint: los mismos 11 problemas preexistentes (4 errores, 7 warnings), ninguno nuevo.
- Build: `✓ Compiled successfully`, con estas rutas en la lista:
  - `ƒ /m/[slug]`
  - `ƒ /[locale]/admin/[companyId]/menu/[tenantId]`
  - `ƒ /api/company/sedes/[tenantId]/menu`
  - `ƒ /api/company/sedes/[tenantId]/menu/publish`
  - `ƒ /api/company/sedes/[tenantId]/menu/categories`

## Checklist manual `[MANUAL]`

Requiere sesión de dueño y una sede con el módulo `online-menu` activado desde el panel.

1. Activar "Menú en línea" en Módulos adicionales. El botón "Menú" aparece en la fila de la sede.
2. Abrir el editor. Carga sin errores y lista las categorías activas de esa sede.
3. Guardar con un enlace inválido (`Pizza Luigi`): mensaje en español sobre el formato, sin texto en inglés.
4. Guardar con un enlace válido y al menos una categoría marcada.
5. Abrir `/m/<slug>` **sin sesión** (ventana privada): responde **404**, porque todavía no se publicó.
6. Publicar. `/m/<slug>` ahora muestra el menú, con las categorías en el orden elegido.
7. Confirmar que la URL **no** se redirige a `/es/m/<slug>`.
8. Desmarcar una categoría, publicar, recargar: desaparece del menú público.
9. Cambiar el precio de un producto desde `/products` de esa sede. En menos de un minuto se refleja en el menú público.
10. Cambiar el enlace a otro válido y publicar. El nuevo funciona y el viejo da 404.
11. Intentar guardar en una segunda sede el mismo enlace de la primera: mensaje de enlace ya en uso.
12. Desactivar el módulo desde el panel. `/m/<slug>` pasa a **404** aunque el menú siga publicado.
13. Abrir `/m/<slug>` en 375 px de ancho: se lee bien, las fotos no desbordan.

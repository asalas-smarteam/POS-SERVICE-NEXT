# Menú en línea 1b‑1 — el lienzo · plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reemplazar el formulario del editor de menú por un lienzo de bloques reordenable por arrastre, con vista previa en vivo dentro de un `iframe` y autoguardado del borrador.

**Architecture:** El esquema guardado ya es una lista ordenada de bloques con un campo `visible`, así que no hay cambio de modelo de datos ni migración. El trabajo es: extraer los componentes de presentación del menú público a un módulo compartido, agregar tres módulos puros (operaciones sobre la lista, agrupado por tamaño, autoguardado), una ruta de vista previa que recibe la lista por `postMessage`, un endpoint de datos para esa vista, y reescribir el editor.

**Tech Stack:** Next.js 16 (App Router, Server Components), React 19 con React Compiler, `@dnd-kit` (ya instalado), Tailwind v4, next-intl, Mongoose (patrón fábrica `Model(conn)`), Vitest (`environment: "node"`).

Spec: `docs/superpowers/specs/2026-08-22-online-menu-canvas-design.md`

## Global Constraints

- **No cambiar el esquema.** `MENU_SCHEMA_VERSION` queda en 1. No hay campo nuevo ni migración.
- **Restricción del React Compiler.** Dentro de un `try`/`catch` no puede haber expresiones condicionales, `??`, `?.` ni operadores lógicos: el compilador descarta el componente entero sin emitir ningún aviso en el build. El parseo de respuestas va en funciones puras fuera del `try`. Esta regla ya está documentada con comentarios en el editor actual; respetarla.
- **`postMessage` con origen validado en los dos sentidos.** El emisor apunta siempre a `window.location.origin`, nunca a `'*'`. El receptor descarta todo mensaje cuyo `event.origin` no sea igual a `window.location.origin`. No es opcional.
- **Categoría activa es `active === true`**, estricto. Nunca `!== false`. Es el mismo criterio que usa `src/store/settingsStore.js` y `renderableBlocks`.
- **Tamaño activo es `active !== false`**, laxo. Es distinto del de categorías a propósito y está explicado en `src/app/lib/tenant/productSizeSettings.js`. No unificarlos.
- **Tests junto al código**, como `<nombre>.test.js` en el mismo directorio. Config en `vitest.config.js`, alias `@` → `src/app`.
- **Mensajes en los dos idiomas.** Toda clave nueva va en `messages/es.json` y `messages/en.json`.
- **Los errores del servidor viajan como códigos**, y el cliente los traduce con el patrón `error_<code>` que ya existe en el editor.
- **Enmascarar los 500.** El cuerpo de error de una ruta solo expone `error.message` cuando el status no es 500; en 500 devuelve un texto fijo.
- **Commits en español**, con el prefijo convencional (`feat:`, `refactor:`, `test:`, `fix:`).

---

### Task 1: Extraer `groupProductsBySize` y el techo de productos

Hoy el agrupado por tamaño vive dentro de un Server Component y por eso no tiene ninguna prueba. Sale a un módulo puro. El techo de 500 productos también sale, porque la Task 5 lo necesita y dos constantes iguales en dos archivos derivan.

**Files:**
- Create: `src/app/lib/menu/menuLimits.js`
- Create: `src/app/lib/menu/groupProductsBySize.js`
- Create: `src/app/lib/menu/groupProductsBySize.test.js`
- Modify: `src/app/m/[slug]/page.jsx`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces:
  - `MAX_MENU_PRODUCTS: number` (500) desde `@/lib/menu/menuLimits`
  - `groupProductsBySize(categoryProducts: Array<{id, name, price, description, image, sizeId}>, sizeOrderMap: Map<string, {label: string, order: number}>): Array<{id, name, description, image, sizes: Array<{id, label, price}>}>` desde `@/lib/menu/groupProductsBySize`

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/lib/menu/groupProductsBySize.test.js`:

```js
import { describe, expect, it } from "vitest";
import { groupProductsBySize } from "@/lib/menu/groupProductsBySize";

const sizeOrder = new Map([
  ["s1", { label: "Pequeña", order: 0 }],
  ["s2", { label: "Mediana", order: 1 }],
  ["s3", { label: "Grande", order: 2 }],
]);

const product = (overrides) => ({
  id: "p1",
  name: "Margarita",
  price: 1000,
  description: "",
  image: null,
  sizeId: "s1",
  ...overrides,
});

describe("groupProductsBySize", () => {
  it("devuelve un arreglo vacio sin productos", () => {
    expect(groupProductsBySize([], sizeOrder)).toEqual([]);
  });

  it("agrupa los productos del mismo nombre en un plato con varias filas", () => {
    const result = groupProductsBySize(
      [
        product({ id: "a", sizeId: "s2", price: 2000 }),
        product({ id: "b", sizeId: "s1", price: 1000 }),
      ],
      sizeOrder,
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Margarita");
    expect(result[0].sizes).toEqual([
      { id: "b", label: "Pequeña", price: 1000 },
      { id: "a", label: "Mediana", price: 2000 },
    ]);
  });

  it("ordena los tamanos por el orden del ajuste, no por el orden de entrada", () => {
    const result = groupProductsBySize(
      [
        product({ id: "a", sizeId: "s3" }),
        product({ id: "b", sizeId: "s1" }),
        product({ id: "c", sizeId: "s2" }),
      ],
      sizeOrder,
    );

    expect(result[0].sizes.map((size) => size.id)).toEqual(["b", "c", "a"]);
  });

  it("agrupa por nombre recortado", () => {
    const result = groupProductsBySize(
      [product({ id: "a", name: "  Margarita  " }), product({ id: "b", name: "Margarita", sizeId: "s2" })],
      sizeOrder,
    );

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Margarita");
  });

  it("no descarta un producto cuyo tamano no resuelve: va al final y sin etiqueta", () => {
    const result = groupProductsBySize(
      [product({ id: "a", sizeId: "borrado" }), product({ id: "b", sizeId: "s1" })],
      sizeOrder,
    );

    expect(result[0].sizes).toEqual([
      { id: "b", label: "Pequeña", price: 1000 },
      { id: "a", label: "", price: 1000 },
    ]);
  });

  it("toma la descripcion y la foto del primer tamano, no de un tamano cualquiera", () => {
    const result = groupProductsBySize(
      [
        product({ id: "a", sizeId: "s3", description: "grande", image: { url: "/g.jpg" } }),
        product({ id: "b", sizeId: "s1", description: "chica", image: { url: "/c.jpg" } }),
      ],
      sizeOrder,
    );

    expect(result[0].description).toBe("chica");
    expect(result[0].image).toEqual({ url: "/c.jpg" });
  });

  it("mantiene separados dos platos distintos", () => {
    const result = groupProductsBySize(
      [product({ id: "a", name: "Margarita" }), product({ id: "b", name: "Napolitana" })],
      sizeOrder,
    );

    expect(result.map((dish) => dish.name)).toEqual(["Margarita", "Napolitana"]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
npx vitest run src/app/lib/menu/groupProductsBySize.test.js
```

Esperado: FAIL, "Failed to resolve import" o "groupProductsBySize is not a function".

- [ ] **Step 3: Crear los dos módulos**

Crear `src/app/lib/menu/menuLimits.js`:

```js
// Techo de productos por render del menu: una sede real no tiene miles de
// productos en sus categorias publicadas, pero nada impide que las tenga. Sin
// un limite, un menu patologico deja que cualquier visitante anonimo pague
// (con tiempo de render y transferencia) una consulta arbitrariamente grande.
// Vive aparte porque lo usan la pagina publica y el endpoint de vista previa,
// y dos copias del mismo numero terminan divergiendo.
export const MAX_MENU_PRODUCTS = 500;
```

Crear `src/app/lib/menu/groupProductsBySize.js` con el cuerpo movido tal cual desde `src/app/m/[slug]/page.jsx`, conservando el comentario que ya tiene:

```js
// Agrupa los productos de una categoria con talles en un plato por nombre
// (recortado) con una fila por talle debajo, en vez de repetir el plato una
// vez por talle. El nombre recortado es la unica clave que el modelo de datos
// ofrece para esto: Product no tiene un id de "plato" que una a sus variantes
// de talle (ver models/tenant/Product.js), solo `productSizeId` apuntando al
// talle. Dos platos genuinamente distintos que compartan nombre por error de
// carga se fusionarian en una sola entrada, mostrando la foto/descripcion de
// uno solo de ellos (el que quede primero segun el orden de talles) y sus
// talles todos mezclados bajo ese nombre.
export function groupProductsBySize(categoryProducts, sizeOrderMap) {
  const groups = new Map();

  for (const product of categoryProducts) {
    const key = product.name.trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(product);
  }

  const orderOf = (product) => sizeOrderMap.get(product.sizeId)?.order ?? Infinity;

  return Array.from(groups.entries()).map(([name, groupProducts]) => {
    // Un producto cuyo talle no resuelve en el ajuste (borrado o desactivado)
    // igual tiene que aparecer: se ordena al final y su fila no lleva
    // etiqueta de talle, pero no se descarta.
    const sorted = [...groupProducts].sort((a, b) => orderOf(a) - orderOf(b));
    const first = sorted[0];

    return {
      id: first.id,
      name,
      description: first.description,
      image: first.image,
      sizes: sorted.map((product) => ({
        id: product.id,
        label: sizeOrderMap.get(product.sizeId)?.label ?? "",
        price: product.price,
      })),
    };
  });
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
npx vitest run src/app/lib/menu/groupProductsBySize.test.js
```

Esperado: PASS, 7 tests.

- [ ] **Step 5: Rewirear la página pública**

En `src/app/m/[slug]/page.jsx`:

1. Borrar la función `groupProductsBySize` completa (con su comentario).
2. Borrar la constante `MAX_MENU_PRODUCTS` y su comentario.
3. Agregar los dos imports junto a los que ya existen:

```js
import { MAX_MENU_PRODUCTS } from "@/lib/menu/menuLimits";
import { groupProductsBySize } from "@/lib/menu/groupProductsBySize";
```

No cambiar ninguna otra línea. El resto del archivo ya llama a `groupProductsBySize(categoryProducts, sizeOrderMap)` y a `.limit(MAX_MENU_PRODUCTS)`.

- [ ] **Step 6: Verificar que la suite completa y el build siguen bien**

```bash
npm test
```

Esperado: todos los archivos en verde, con 7 tests más que antes.

```bash
npm run build
```

Esperado: `✓ Compiled successfully`, y en la tabla de rutas `● /m/[slug]` (el `●` es el ISR; si aparece `ƒ` algo se rompió).

- [ ] **Step 7: Commit**

```bash
git add src/app/lib/menu/menuLimits.js src/app/lib/menu/groupProductsBySize.js src/app/lib/menu/groupProductsBySize.test.js "src/app/m/[slug]/page.jsx"
git commit -m "refactor(menu): extraer groupProductsBySize y el techo de productos"
```

---

### Task 2: Componentes de presentación compartidos

Los componentes del menú público ya son funciones puras de sus props, pero viven dentro de la carpeta de la ruta pública y el despacho bloque → componente está escrito inline en la página. La vista previa del editor tiene que renderizar exactamente lo mismo, y la única forma de garantizarlo es que sea el mismo código.

**Files:**
- Create: `src/app/components/menu/menu-blocks.jsx` (movido desde `src/app/m/[slug]/menu-blocks.jsx`, más `MenuBlockList`)
- Create: `src/app/lib/menu/menuFormat.js`
- Delete: `src/app/m/[slug]/menu-blocks.jsx`
- Modify: `src/app/m/[slug]/page.jsx`

**Interfaces:**
- Consumes: `groupProductsBySize` de Task 1.
- Produces:
  - `MenuBlockList({ blocks, categoryMap, productsByCategory, sizeOrderMap, formatPrice })` desde `@/components/menu/menu-blocks`
    - `blocks`: la lista **sin filtrar**; el componente aplica `renderableBlocks` internamente
    - `categoryMap`: `Map<categoryId, { label, active, hasSizes }>`
    - `productsByCategory`: `Map<categoryId, Array<{id, name, price, description, image, sizeId}>>`
    - `sizeOrderMap`: `Map<sizeId, { label, order }>`
    - `formatPrice`: `(amount: number) => string`
  - `HeroBlock`, `CategoryBlock`, `SizedCategoryBlock`, `FooterBlock` desde la misma ruta (sin cambios)
  - `createMenuPriceFormatter(currency): (amount) => string` desde `@/lib/menu/menuFormat`

- [ ] **Step 1: Mover el archivo con git para conservar el historial**

```bash
mkdir -p src/app/components/menu
git mv "src/app/m/[slug]/menu-blocks.jsx" src/app/components/menu/menu-blocks.jsx
```

- [ ] **Step 2: Agregar `MenuBlockList` al final del archivo movido**

Agregar los imports al principio de `src/app/components/menu/menu-blocks.jsx`, junto al `import Image from "next/image"` que ya está:

```js
import { renderableBlocks } from "@/lib/menu/menuSchema";
import { groupProductsBySize } from "@/lib/menu/groupProductsBySize";
```

Y agregar al final del archivo:

```jsx
// Despacho bloque -> componente. Vive aca y no en la pagina publica porque la
// vista previa del editor renderiza exactamente esto: si hubiera dos copias
// del despacho, la previa mostraria algo distinto de lo que el visitante ve el
// dia que alguien toque una sola de las dos.
//
// El filtrado con renderableBlocks va adentro, no afuera: ocultar un bloque y
// desactivar una categoria tienen que comportarse igual en la previa que en el
// menu publico sin que cada consumidor tenga que acordarse de filtrar. La
// pagina publica igual llama a renderableBlocks por su cuenta, porque necesita
// la lista filtrada antes de renderizar (para armar la consulta de productos y
// para su notFound de menu sin contenido visible); que se calcule dos veces es
// irrelevante al lado de que las dos vistas filtren distinto.
export function MenuBlockList({
  blocks,
  categoryMap,
  productsByCategory,
  sizeOrderMap,
  formatPrice,
}) {
  return renderableBlocks(blocks, categoryMap).map((block) => {
    if (block.type === "hero") {
      return <HeroBlock key={block.id} data={block.data} />;
    }

    if (block.type === "footer") {
      return <FooterBlock key={block.id} data={block.data} />;
    }

    const category = categoryMap.get(block.data.categoryId);
    const categoryProducts = productsByCategory.get(block.data.categoryId) ?? [];

    // El agrupado por talle es presentacional: lo decide el flag `hasSizes` de
    // la categoria (el mismo que usa el resto del POS), no un campo nuevo del
    // bloque. Una categoria sin talles se sigue renderando plana.
    if (category?.hasSizes) {
      return (
        <SizedCategoryBlock
          key={block.id}
          label={category?.label ?? ""}
          dishes={groupProductsBySize(categoryProducts, sizeOrderMap)}
          showPhotos={block.data.showPhotos}
          showDescriptions={block.data.showDescriptions}
          formatPrice={formatPrice}
        />
      );
    }

    return (
      <CategoryBlock
        key={block.id}
        label={category?.label ?? ""}
        products={categoryProducts}
        showPhotos={block.data.showPhotos}
        showDescriptions={block.data.showDescriptions}
        formatPrice={formatPrice}
      />
    );
  });
}
```

- [ ] **Step 3: Crear el formateador compartido**

Crear `src/app/lib/menu/menuFormat.js`:

```js
import { formatCurrencyAmount } from "@/lib/formatCurrencyAmount";
import { defaultLocale } from "../../../../i18n";

// El menu publico vive fuera de [locale] y siempre formatea con el locale por
// defecto. La vista previa del editor, en cambio, corre dentro de [locale], asi
// que si formateara con el locale de la sesion un dueño en ingles veria numeros
// distintos de los que ve su cliente. Por eso las dos vistas pasan por aca.
export function createMenuPriceFormatter(currency) {
  return (amount) => formatCurrencyAmount(amount, currency, defaultLocale);
}
```

- [ ] **Step 4: Rewirear la página pública**

En `src/app/m/[slug]/page.jsx`:

1. Reemplazar el import de los bloques:

```js
import { MenuBlockList } from "@/components/menu/menu-blocks";
import { createMenuPriceFormatter } from "@/lib/menu/menuFormat";
```

Borrar el viejo `import { CategoryBlock, FooterBlock, HeroBlock, SizedCategoryBlock } from "./menu-blocks";`, el `import { formatCurrencyAmount } from "@/lib/formatCurrencyAmount";` y el `import { defaultLocale } from "../../../../i18n";`.

2. Reemplazar la definición de `formatPrice`:

```js
  const formatPrice = createMenuPriceFormatter(settings?.currency);
```

3. Reemplazar todo el `return` del componente por:

```jsx
  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-neutral-900">
      <MenuBlockList
        blocks={blocks}
        categoryMap={categoryMap}
        productsByCategory={productsByCategory}
        sizeOrderMap={sizeOrderMap}
        formatPrice={formatPrice}
      />
    </main>
  );
```

`blocks` ya es el resultado de `renderableBlocks`; pasarlo filtrado es correcto y `MenuBlockList` lo vuelve a filtrar sin efecto.

No tocar `generateMetadata` ni ninguno de los guards de `notFound()`.

- [ ] **Step 5: Verificar**

```bash
npm test
```

Esperado: sin cambios respecto de la Task 1, todo en verde.

```bash
npx eslint --no-cache src
```

Esperado: `✖ 11 problems (4 errors, 7 warnings)`. Ese es el estado preexistente del repo. Cualquier problema **nuevo**, o un total distinto de 11, es una regresión de esta tarea.

```bash
npm run build
```

Esperado: `✓ Compiled successfully` y `● /m/[slug]` en la tabla.

- [ ] **Step 6: Confirmar que no quedó ninguna referencia al archivo viejo**

```bash
grep -rn "m/\[slug\]/menu-blocks\|from \"./menu-blocks\"" src/
```

Esperado: sin resultados.

- [ ] **Step 7: Commit**

```bash
git add -A src/app/components/menu src/app/lib/menu/menuFormat.js "src/app/m/[slug]"
git commit -m "refactor(menu): componentes de presentacion compartidos entre la pagina publica y la futura vista previa"
```

---

### Task 3: Operaciones del lienzo

Módulo puro con todo lo que el editor le hace a la lista de bloques. Sin React, sin red, sin DOM.

**Files:**
- Create: `src/app/lib/menu/menuBlockList.js`
- Create: `src/app/lib/menu/menuBlockList.test.js`

**Interfaces:**
- Consumes: nada.
- Produces, desde `@/lib/menu/menuBlockList`:
  - `moveBlock(blocks, fromIndex, toIndex): Block[]`
  - `removeBlock(blocks, blockId): Block[]`
  - `toggleBlockVisibility(blocks, blockId): Block[]`
  - `updateBlockData(blocks, blockId, patch): Block[]`
  - `addBlock(blocks, type, data?): Block[]`
  - `canAddType(blocks, type): boolean`
  - `availableCategories(blocks, categories): Array<{id, label}>`
  - `blockIdFor(type, data?): string`

  `Block` es `{ id: string, type: 'hero'|'category'|'footer', visible: boolean, data: object }`, el mismo que `normalizeMenuDraft` produce.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/lib/menu/menuBlockList.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  addBlock,
  availableCategories,
  blockIdFor,
  canAddType,
  moveBlock,
  removeBlock,
  toggleBlockVisibility,
  updateBlockData,
} from "@/lib/menu/menuBlockList";

const hero = { id: "hero", type: "hero", visible: true, data: { title: "Luigi", subtitle: "" } };
const pizzas = {
  id: "category-c1",
  type: "category",
  visible: true,
  data: { categoryId: "c1", showPhotos: true, showDescriptions: true },
};
const bebidas = {
  id: "category-c2",
  type: "category",
  visible: true,
  data: { categoryId: "c2", showPhotos: true, showDescriptions: true },
};
const footer = { id: "footer", type: "footer", visible: true, data: { text: "", phone: "", address: "" } };

const base = () => [hero, pizzas, bebidas, footer];

describe("moveBlock", () => {
  it("mueve del final al principio", () => {
    expect(moveBlock(base(), 3, 0).map((b) => b.id)).toEqual([
      "footer",
      "hero",
      "category-c1",
      "category-c2",
    ]);
  });

  it("mueve del principio al final", () => {
    expect(moveBlock(base(), 0, 3).map((b) => b.id)).toEqual([
      "category-c1",
      "category-c2",
      "footer",
      "hero",
    ]);
  });

  it("no altera la lista cuando los indices son iguales", () => {
    expect(moveBlock(base(), 1, 1).map((b) => b.id)).toEqual(base().map((b) => b.id));
  });

  it("no altera la lista cuando un indice esta fuera de rango", () => {
    expect(moveBlock(base(), 0, 9).map((b) => b.id)).toEqual(base().map((b) => b.id));
    expect(moveBlock(base(), -1, 0).map((b) => b.id)).toEqual(base().map((b) => b.id));
  });

  it("no muta el arreglo original", () => {
    const blocks = base();
    moveBlock(blocks, 0, 3);
    expect(blocks.map((b) => b.id)).toEqual(base().map((b) => b.id));
  });
});

describe("removeBlock", () => {
  it("saca el bloque pedido", () => {
    expect(removeBlock(base(), "category-c1").map((b) => b.id)).toEqual([
      "hero",
      "category-c2",
      "footer",
    ]);
  });

  it("ignora un id que no existe", () => {
    expect(removeBlock(base(), "nada")).toHaveLength(4);
  });
});

describe("toggleBlockVisibility", () => {
  it("alterna visible del bloque pedido y solo de ese", () => {
    const result = toggleBlockVisibility(base(), "category-c1");
    expect(result[1].visible).toBe(false);
    expect(result[2].visible).toBe(true);
  });

  it("vuelve a visible al alternar dos veces", () => {
    const once = toggleBlockVisibility(base(), "hero");
    expect(toggleBlockVisibility(once, "hero")[0].visible).toBe(true);
  });
});

describe("updateBlockData", () => {
  it("aplica el parche sin borrar los otros campos", () => {
    const result = updateBlockData(base(), "hero", { subtitle: "La mejor pizza" });
    expect(result[0].data).toEqual({ title: "Luigi", subtitle: "La mejor pizza" });
  });

  it("no toca los demas bloques", () => {
    const result = updateBlockData(base(), "hero", { title: "Otro" });
    expect(result[1]).toBe(base()[1]);
  });
});

describe("canAddType", () => {
  it("no deja agregar una segunda portada ni un segundo pie", () => {
    expect(canAddType(base(), "hero")).toBe(false);
    expect(canAddType(base(), "footer")).toBe(false);
  });

  it("deja agregar portada cuando no hay", () => {
    expect(canAddType([pizzas, footer], "hero")).toBe(true);
  });

  it("siempre deja agregar categorias", () => {
    expect(canAddType(base(), "category")).toBe(true);
  });

  it("rechaza un tipo desconocido", () => {
    expect(canAddType(base(), "galeria")).toBe(false);
  });
});

describe("addBlock", () => {
  it("agrega al final", () => {
    const result = addBlock([pizzas], "footer");
    expect(result.map((b) => b.id)).toEqual(["category-c1", "footer"]);
  });

  it("crea la portada con sus campos vacios y visible", () => {
    const result = addBlock([], "hero");
    expect(result[0]).toEqual({
      id: "hero",
      type: "hero",
      visible: true,
      data: { title: "", subtitle: "" },
    });
  });

  it("crea el pie con sus tres campos vacios", () => {
    expect(addBlock([], "footer")[0].data).toEqual({ text: "", phone: "", address: "" });
  });

  it("crea la categoria con fotos y descripciones prendidas", () => {
    const result = addBlock([], "category", { categoryId: "c9" });
    expect(result[0]).toEqual({
      id: "category-c9",
      type: "category",
      visible: true,
      data: { categoryId: "c9", showPhotos: true, showDescriptions: true },
    });
  });

  it("no agrega una segunda portada", () => {
    expect(addBlock(base(), "hero")).toHaveLength(4);
  });

  it("no agrega dos veces la misma categoria", () => {
    expect(addBlock(base(), "category", { categoryId: "c1" })).toHaveLength(4);
  });

  it("no agrega una categoria sin categoryId", () => {
    expect(addBlock(base(), "category")).toHaveLength(4);
  });

  it("no agrega un tipo desconocido", () => {
    expect(addBlock(base(), "galeria")).toHaveLength(4);
  });
});

describe("availableCategories", () => {
  const categories = [
    { id: "c1", label: "Pizzas" },
    { id: "c2", label: "Bebidas" },
    { id: "c3", label: "Postres" },
  ];

  it("devuelve solo las que todavia no son bloque", () => {
    expect(availableCategories(base(), categories)).toEqual([{ id: "c3", label: "Postres" }]);
  });

  it("cuenta una categoria oculta como ya usada", () => {
    const blocks = [{ ...pizzas, visible: false }];
    expect(availableCategories(blocks, categories).map((c) => c.id)).toEqual(["c2", "c3"]);
  });

  it("devuelve todas cuando no hay bloques de categoria", () => {
    expect(availableCategories([hero, footer], categories)).toHaveLength(3);
  });
});

describe("blockIdFor", () => {
  it("usa el tipo para portada y pie", () => {
    expect(blockIdFor("hero")).toBe("hero");
    expect(blockIdFor("footer")).toBe("footer");
  });

  it("usa el id de categoria para las categorias", () => {
    expect(blockIdFor("category", { categoryId: "c1" })).toBe("category-c1");
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
npx vitest run src/app/lib/menu/menuBlockList.test.js
```

Esperado: FAIL, "Failed to resolve import".

- [ ] **Step 3: Implementar el módulo**

Crear `src/app/lib/menu/menuBlockList.js`:

```js
import { BLOCK_TYPES } from "@/lib/menu/menuSchema";

// Portada y pie son bloques como cualquier otro —se arrastran, se ocultan y se
// quitan— pero uno solo de cada. Un menu con dos pies no significa nada, y
// permitirlo obliga a inventar que hace el renderizador con el segundo.
const SINGLETON_TYPES = Object.freeze(["hero", "footer"]);

const EMPTY_DATA = Object.freeze({
  hero: { title: "", subtitle: "" },
  footer: { text: "", phone: "", address: "" },
});

export function blockIdFor(type, data) {
  if (type === "category") {
    return `category-${data?.categoryId ?? ""}`;
  }
  return type;
}

function withoutMutating(blocks) {
  return Array.isArray(blocks) ? [...blocks] : [];
}

export function moveBlock(blocks, fromIndex, toIndex) {
  const next = withoutMutating(blocks);
  const lastIndex = next.length - 1;

  const outOfRange =
    !Number.isInteger(fromIndex) ||
    !Number.isInteger(toIndex) ||
    fromIndex < 0 ||
    toIndex < 0 ||
    fromIndex > lastIndex ||
    toIndex > lastIndex;

  if (outOfRange || fromIndex === toIndex) {
    return next;
  }

  const [moved] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, moved);
  return next;
}

export function removeBlock(blocks, blockId) {
  return withoutMutating(blocks).filter((block) => block.id !== blockId);
}

export function toggleBlockVisibility(blocks, blockId) {
  return withoutMutating(blocks).map((block) =>
    block.id === blockId ? { ...block, visible: block.visible === false } : block,
  );
}

export function updateBlockData(blocks, blockId, patch) {
  return withoutMutating(blocks).map((block) =>
    block.id === blockId ? { ...block, data: { ...block.data, ...patch } } : block,
  );
}

export function canAddType(blocks, type) {
  if (!BLOCK_TYPES.includes(type)) {
    return false;
  }
  if (!SINGLETON_TYPES.includes(type)) {
    return true;
  }
  return !withoutMutating(blocks).some((block) => block.type === type);
}

// Agrega siempre al final, tambien la portada. La regla uniforme ("lo que
// agregas aparece abajo y lo arrastras a donde quieras") es mas facil de
// predecir que una excepcion para el hero, y es coherente con tratarlo como un
// bloque mas.
export function addBlock(blocks, type, data) {
  if (!canAddType(blocks, type)) {
    return withoutMutating(blocks);
  }

  if (type === "category") {
    const categoryId = String(data?.categoryId ?? "").trim();
    if (!categoryId) {
      return withoutMutating(blocks);
    }
    const alreadyThere = withoutMutating(blocks).some(
      (block) => block.type === "category" && block.data.categoryId === categoryId,
    );
    if (alreadyThere) {
      return withoutMutating(blocks);
    }

    return [
      ...withoutMutating(blocks),
      {
        id: blockIdFor("category", { categoryId }),
        type: "category",
        visible: true,
        data: { categoryId, showPhotos: true, showDescriptions: true },
      },
    ];
  }

  return [
    ...withoutMutating(blocks),
    {
      id: blockIdFor(type),
      type,
      visible: true,
      data: { ...EMPTY_DATA[type] },
    },
  ];
}

// Un bloque oculto cuenta como usado: la categoria ya esta en el menu, apagada.
// Ofrecerla de nuevo en "Agregar" produciria dos bloques de la misma categoria,
// que normalizeMenuDraft despues descarta en silencio.
export function availableCategories(blocks, categories) {
  const used = new Set(
    withoutMutating(blocks)
      .filter((block) => block.type === "category")
      .map((block) => block.data.categoryId),
  );

  return (Array.isArray(categories) ? categories : []).filter(
    (category) => !used.has(category.id),
  );
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
npx vitest run src/app/lib/menu/menuBlockList.test.js
```

Esperado: PASS, 28 tests.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/menu/menuBlockList.js src/app/lib/menu/menuBlockList.test.js
git commit -m "feat(menu): operaciones puras del lienzo de bloques"
```

---

### Task 4: Autoguardado

Lo que importa acá no es el temporizador, es la concurrencia. Un arrastre rápido dispara varios guardados y el orden de llegada de las respuestas no está garantizado: si la segunda responde antes que la primera, el borrador que queda en la base es el viejo.

**Files:**
- Create: `src/app/lib/menu/createAutosave.js`
- Create: `src/app/lib/menu/createAutosave.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `createAutosave({ save, delay?, onStatusChange? })` desde `@/lib/menu/createAutosave`, devolviendo
  - `schedule(payload): void`
  - `flush(): Promise<boolean>` — `true` si no quedó nada sin guardar
  - `retry(): Promise<boolean>`
  - `cancel(): void`
  - `hasPending(): boolean`
  - `getStatus(): 'idle'|'pending'|'saving'|'saved'|'error'`

  `save` es `(payload) => Promise<void>`; si rechaza, cuenta como fallo.

> **Desviación del spec, deliberada.** El spec dice "temporizador inyectado". Se usa `vi.useFakeTimers()` en los tests en lugar de un parámetro de inyección: consigue lo mismo sin agregar a la API pública un parámetro que solo existe para poder testear.

- [ ] **Step 1: Escribir el test que falla**

Crear `src/app/lib/menu/createAutosave.test.js`:

```js
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createAutosave } from "@/lib/menu/createAutosave";

// Un `save` controlable a mano: cada llamada queda pendiente hasta que el test
// la resuelve. Es lo que permite probar el solapamiento, que es todo el punto
// de este modulo.
function deferredSaver() {
  const calls = [];
  const save = (payload) => {
    let resolve;
    let reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    calls.push({ payload, resolve, reject });
    return promise;
  };
  return { save, calls };
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("createAutosave", () => {
  it("no guarda nada antes de que venza el debounce", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1499);

    expect(calls).toHaveLength(0);
    expect(autosave.getStatus()).toBe("pending");
  });

  it("colapsa varios cambios seguidos en un solo guardado, con el ultimo valor", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(500);
    autosave.schedule({ n: 2 });
    await vi.advanceTimersByTimeAsync(500);
    autosave.schedule({ n: 3 });
    await vi.advanceTimersByTimeAsync(1500);

    expect(calls).toHaveLength(1);
    expect(calls[0].payload).toEqual({ n: 3 });
  });

  it("nunca tiene dos guardados en vuelo a la vez", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    expect(calls).toHaveLength(1);

    autosave.schedule({ n: 2 });
    await vi.advanceTimersByTimeAsync(1500);

    // El primero sigue sin resolver: el segundo tiene que estar esperando.
    expect(calls).toHaveLength(1);

    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    expect(calls[1].payload).toEqual({ n: 2 });
  });

  it("encola solo el ultimo cambio, no todos los que llegaron mientras guardaba", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);

    autosave.schedule({ n: 2 });
    autosave.schedule({ n: 3 });
    autosave.schedule({ n: 4 });
    await vi.advanceTimersByTimeAsync(1500);

    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    expect(calls[1].payload).toEqual({ n: 4 });
  });

  it("pasa a saved cuando no queda nada pendiente", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(autosave.getStatus()).toBe("saved");
    expect(autosave.hasPending()).toBe(false);
  });

  it("un fallo detiene la cadena y no reintenta solo", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].reject(new Error("red caida"));
    await vi.advanceTimersByTimeAsync(0);

    expect(autosave.getStatus()).toBe("error");

    autosave.schedule({ n: 2 });
    await vi.advanceTimersByTimeAsync(10000);

    expect(calls).toHaveLength(1);
    expect(autosave.getStatus()).toBe("error");
  });

  it("retry vuelve a mandar el ultimo estado, no el que fallo", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].reject(new Error("red caida"));
    await vi.advanceTimersByTimeAsync(0);

    autosave.schedule({ n: 2 });
    const retried = autosave.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    expect(calls[1].payload).toEqual({ n: 2 });

    calls[1].resolve();
    await expect(retried).resolves.toBe(true);
    expect(autosave.getStatus()).toBe("saved");
  });

  it("retry reenvia el payload que fallo si no hubo cambios despues", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].reject(new Error("red caida"));
    await vi.advanceTimersByTimeAsync(0);

    autosave.retry();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls[1].payload).toEqual({ n: 1 });
  });

  it("flush guarda sin esperar el debounce", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    const flushed = autosave.flush();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(1);

    calls[0].resolve();
    await expect(flushed).resolves.toBe(true);
  });

  it("flush espera al guardado en vuelo y despues al encolado", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    autosave.schedule({ n: 2 });

    const flushed = autosave.flush();
    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(calls).toHaveLength(2);
    calls[1].resolve();
    await expect(flushed).resolves.toBe(true);
  });

  it("flush devuelve false si el guardado falla", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    const flushed = autosave.flush();
    await vi.advanceTimersByTimeAsync(0);
    calls[0].reject(new Error("red caida"));

    await expect(flushed).resolves.toBe(false);
  });

  it("flush sin nada pendiente resuelve true sin llamar a save", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    await expect(autosave.flush()).resolves.toBe(true);
    expect(calls).toHaveLength(0);
  });

  it("cancel descarta lo pendiente", async () => {
    const { save, calls } = deferredSaver();
    const autosave = createAutosave({ save, delay: 1500 });

    autosave.schedule({ n: 1 });
    autosave.cancel();
    await vi.advanceTimersByTimeAsync(5000);

    expect(calls).toHaveLength(0);
    expect(autosave.hasPending()).toBe(false);
  });

  it("avisa cada cambio de estado", async () => {
    const { save, calls } = deferredSaver();
    const seen = [];
    const autosave = createAutosave({
      save,
      delay: 1500,
      onStatusChange: (status) => seen.push(status),
    });

    autosave.schedule({ n: 1 });
    await vi.advanceTimersByTimeAsync(1500);
    calls[0].resolve();
    await vi.advanceTimersByTimeAsync(0);

    expect(seen).toEqual(["pending", "saving", "saved"]);
  });
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

```bash
npx vitest run src/app/lib/menu/createAutosave.test.js
```

Esperado: FAIL, "Failed to resolve import".

- [ ] **Step 3: Implementar el módulo**

Crear `src/app/lib/menu/createAutosave.js`:

```js
// Autoguardado con debounce y una sola escritura en vuelo.
//
// La parte que no es obvia es la cola de uno. Sin ella, un arrastre rapido
// dispara varios PUT y el borrador que queda en la base es el de la respuesta
// que llegue ultima, no el ultimo estado del editor: HTTP no garantiza orden de
// llegada. Con la cola, la segunda escritura no arranca hasta que la primera
// termino, y siempre lleva el estado mas nuevo que se conozca en ese momento.
//
// El otro criterio deliberado es que un fallo detiene la cadena. Reintentar
// solo contra un endpoint que falla no lo arregla, esconde el problema, y en
// una perdida de red convierte cada cambio en un pedido mas.
export function createAutosave({ save, delay = 1500, onStatusChange } = {}) {
  let timer = null;
  let pending = null;
  let hasPendingPayload = false;
  let inFlight = null;
  let failed = false;
  let status = "idle";

  const setStatus = (next) => {
    if (status === next) {
      return;
    }
    status = next;
    if (onStatusChange) {
      onStatusChange(next);
    }
  };

  const clearTimer = () => {
    if (timer !== null) {
      clearTimeout(timer);
      timer = null;
    }
  };

  async function runChain() {
    while (hasPendingPayload && !failed) {
      const payload = pending;
      pending = null;
      hasPendingPayload = false;
      setStatus("saving");

      try {
        await save(payload);
      } catch {
        failed = true;
        // Si no llego nada nuevo mientras fallaba, el payload que fallo vuelve
        // a la cola: sin esto, un retry no tendria que reenviar.
        if (!hasPendingPayload) {
          pending = payload;
          hasPendingPayload = true;
        }
        setStatus("error");
        return false;
      }
    }

    if (!failed) {
      setStatus("saved");
    }
    return !failed;
  }

  function start() {
    if (inFlight) {
      return inFlight;
    }
    inFlight = runChain().finally(() => {
      inFlight = null;
    });
    return inFlight;
  }

  return {
    schedule(payload) {
      pending = payload;
      hasPendingPayload = true;

      if (failed) {
        // En estado de error no se reprograma nada: el cambio queda guardado en
        // memoria y sale cuando el dueño toque "reintentar".
        return;
      }

      setStatus("pending");
      clearTimer();
      timer = setTimeout(() => {
        timer = null;
        start();
      }, delay);
    },

    async flush() {
      clearTimer();
      if (inFlight) {
        await inFlight;
      }
      if (hasPendingPayload && !failed) {
        await start();
      }
      return !failed && !hasPendingPayload;
    },

    async retry() {
      failed = false;
      clearTimer();
      return start();
    },

    cancel() {
      clearTimer();
      pending = null;
      hasPendingPayload = false;
      failed = false;
      setStatus("idle");
    },

    hasPending() {
      return hasPendingPayload || Boolean(inFlight);
    },

    getStatus() {
      return status;
    },
  };
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

```bash
npx vitest run src/app/lib/menu/createAutosave.test.js
```

Esperado: PASS, 14 tests. Si alguno de los de solapamiento falla, el bug está en `runChain`/`start`, no en el test: revisar que `start()` devuelva la promesa existente cuando ya hay una en vuelo.

- [ ] **Step 5: Correr la suite completa**

```bash
npm test
```

Esperado: todo en verde.

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/menu/createAutosave.js src/app/lib/menu/createAutosave.test.js
git commit -m "feat(menu): autoguardado con debounce y una sola escritura en vuelo"
```

---

### Task 5: Endpoint de datos para la vista previa

El editor vive en el panel del dueño, que no tiene sesión de sede, así que no puede reusar `/api/settings` ni `/api/products`. Necesita su propia lectura company-scoped, igual que ya hace el endpoint de categorías.

**Files:**
- Create: `src/app/api/company/sedes/[tenantId]/menu/preview-data/route.js`

**Interfaces:**
- Consumes: `MAX_MENU_PRODUCTS` de Task 1.
- Produces: `GET /api/company/sedes/<tenantId>/menu/preview-data` →
  ```json
  {
    "categories": [{ "id": "c1", "label": "Pizzas", "hasSizes": true }],
    "products": [{ "id": "p1", "categoryId": "c1", "name": "Margarita", "price": 4500, "description": "", "image": { "url": "/uploads/..." }, "sizeId": "s1" }],
    "sizes": [{ "id": "s1", "label": "Pequeña", "order": 0 }],
    "currency": { "code": "CRC", "symbol": "₡", "decimals": 0 },
    "truncated": false
  }
  ```

- [ ] **Step 1: Crear la ruta**

Crear `src/app/api/company/sedes/[tenantId]/menu/preview-data/route.js`:

```js
import { NextResponse } from 'next/server';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';
import { getProductCategories } from '@/lib/tenant/categorySettings';
import { getProductSizes } from '@/lib/tenant/productSizeSettings';
import { getSystemSettings } from '@/lib/tenant/systemSettings';
import { MAX_MENU_PRODUCTS } from '@/lib/menu/menuLimits';

// Datos crudos para la vista previa del editor. Devuelve TODAS las categorias
// activas y no solo las que hoy son bloque: la lista del lienzo cambia en vivo,
// y si esto dependiera de que categorias estan puestas, agregar una obligaria a
// un refetch y la previa saltaria en cada agregado.
//
// Todo sale como arreglo, nunca como Map: JSON no transporta Map. El cliente
// arma los Map que MenuBlockList espera.
export async function GET(req, { params }) {
  try {
    const { tenantId } = await params;
    const { sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    const conn = await getTenantConnection(sede.dbName);
    const [categoryRows, sizeRows, settings] = await Promise.all([
      getProductCategories(conn),
      getProductSizes(conn),
      getSystemSettings(conn),
    ]);

    // Estricto (=== true), igual que renderableBlocks y que el endpoint de
    // categorias. Si aca apareciera una categoria que el renderizador despues
    // descarta, la previa mostraria una seccion que el menu publico no tiene.
    const categories = categoryRows
      .filter((row) => row?.id && row.active === true)
      .map((row) => ({
        id: String(row.id),
        label: row.label ?? String(row.id),
        hasSizes: row.hasSizes === true,
      }));

    const categoryIds = categories.map((category) => category.id);

    // limit + 1 para poder distinguir "500 justos" de "hay mas": una previa
    // recortada que no lo dice es una previa que miente.
    const rows = categoryIds.length
      ? await ProductModel(conn)
          .find({ categoryId: { $in: categoryIds } })
          .select('name price description image categoryId productSizeId')
          .sort({ name: 1 })
          .limit(MAX_MENU_PRODUCTS + 1)
          .lean()
      : [];

    const truncated = rows.length > MAX_MENU_PRODUCTS;

    const products = rows.slice(0, MAX_MENU_PRODUCTS).map((row) => ({
      id: String(row._id),
      categoryId: String(row.categoryId ?? ''),
      name: row.name,
      price: row.price,
      description: row.description || '',
      image: row.image?.url ? { url: row.image.url } : null,
      sizeId: row.productSizeId ? String(row.productSizeId) : null,
    }));

    // El orden es la posicion en el arreglo ya filtrado, exactamente como lo
    // calcula getProductSizeOrderMap para la pagina publica.
    const sizes = sizeRows.map((row, index) => ({
      id: String(row.id),
      label: typeof row.label === 'string' ? row.label : '',
      order: index,
    }));

    return NextResponse.json({
      categories,
      products,
      sizes,
      currency: settings?.currency ?? null,
      truncated,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to load preview data' : error.message },
      { status },
    );
  }
}
```

- [ ] **Step 2: Verificar que compila y que la ruta aparece**

```bash
npm run build
```

Esperado: `✓ Compiled successfully`, y en la tabla de rutas `ƒ /api/company/sedes/[tenantId]/menu/preview-data`.

- [ ] **Step 3: Verificar que el gate es el correcto**

```bash
grep -n "requireOwnerSede" "src/app/api/company/sedes/[tenantId]/menu/preview-data/route.js"
```

Esperado: una línea, con `'online-menu'` como tercer argumento. Sin ese argumento la ruta serviría datos de productos a un dueño que no contrató el módulo.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/company/sedes/[tenantId]/menu/preview-data"
git commit -m "feat(menu): endpoint de datos para la vista previa del editor"
```

---

### Task 6: Ruta de vista previa

El contenido del `iframe`. No es una página que el dueño visite por su cuenta.

**Files:**
- Create: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview/page.jsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes: `MenuBlockList` y `createMenuPriceFormatter` de Task 2; el endpoint de Task 5.
- Produces: el protocolo `postMessage`, que la Task 8 usa desde el lado del padre:
  - la previa emite `{ type: 'menu-preview-ready' }` al montar
  - la previa acepta `{ type: 'menu-preview-blocks', blocks: Block[] }`

- [ ] **Step 1: Agregar las claves de traducción**

En `messages/es.json`, dentro del objeto `OnlineMenu`, agregar:

```json
    "previewEmpty": "El menú todavía no tiene bloques.",
    "previewError": "No se pudo cargar la vista previa.",
    "previewTruncated": "La vista previa muestra los primeros 500 productos."
```

En `messages/en.json`, dentro del mismo objeto:

```json
    "previewEmpty": "The menu has no blocks yet.",
    "previewError": "Preview could not be loaded.",
    "previewTruncated": "The preview shows the first 500 products."
```

- [ ] **Step 2: Crear la página**

Crear `src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview/page.jsx`:

```jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { MenuBlockList } from "@/components/menu/menu-blocks";
import { createMenuPriceFormatter } from "@/lib/menu/menuFormat";

const READY_MESSAGE = "menu-preview-ready";
const BLOCKS_MESSAGE = "menu-preview-blocks";

// El compilador de React no soporta condicionales, `??`, `?.` ni operadores
// logicos dentro de un try/catch: si aparecen ahi, deja al componente entero
// sin compilar y sin avisar. Por eso el parseo de la respuesta vive aca afuera
// y dentro del try de abajo solo hay llamadas y asignaciones planas.
function readPreviewData(body) {
  const source = body || {};
  return {
    categories: Array.isArray(source.categories) ? source.categories : [],
    products: Array.isArray(source.products) ? source.products : [],
    sizes: Array.isArray(source.sizes) ? source.sizes : [],
    currency: source.currency || null,
    truncated: source.truncated === true,
  };
}

export default function MenuPreviewPage() {
  const t = useTranslations("OnlineMenu");
  const params = useParams();
  const tenantId = String(params?.tenantId ?? "");

  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);
  const [blocks, setBlocks] = useState([]);

  useEffect(() => {
    async function loadPreviewData() {
      try {
        const res = await fetch(`/api/company/sedes/${tenantId}/menu/preview-data`);
        const body = await res.json().catch(() => ({}));
        if (!res.ok) {
          setFailed(true);
          return;
        }
        setData(readPreviewData(body));
        setFailed(false);
      } catch {
        setFailed(true);
      }
    }

    loadPreviewData();
  }, [tenantId]);

  // El aviso de "listo" es lo que evita la carrera al montar: el padre puede
  // mandar la primera lista antes de que este listener exista, y ese primer
  // dibujo saldria vacio sin motivo aparente.
  useEffect(() => {
    const origin = window.location.origin;

    function handleMessage(event) {
      // Validar el origen no es defensivo, es obligatorio: un iframe de mismo
      // origen dentro de una pagina autenticada es exactamente el escenario
      // donde un postMessage sin filtrar se vuelve un canal de inyeccion desde
      // cualquier ventana que tenga una referencia a esta.
      if (event.origin !== origin) {
        return;
      }
      const message = event.data;
      if (!message || message.type !== BLOCKS_MESSAGE) {
        return;
      }
      setBlocks(Array.isArray(message.blocks) ? message.blocks : []);
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: READY_MESSAGE }, origin);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const categoryMap = useMemo(() => {
    const rows = data ? data.categories : [];
    return new Map(rows.map((category) => [category.id, { ...category, active: true }]));
  }, [data]);

  const productsByCategory = useMemo(() => {
    const grouped = new Map();
    const rows = data ? data.products : [];
    for (const product of rows) {
      if (!grouped.has(product.categoryId)) {
        grouped.set(product.categoryId, []);
      }
      grouped.get(product.categoryId).push(product);
    }
    return grouped;
  }, [data]);

  const sizeOrderMap = useMemo(() => {
    const rows = data ? data.sizes : [];
    return new Map(rows.map((size) => [size.id, { label: size.label, order: size.order }]));
  }, [data]);

  const formatPrice = useMemo(
    () => createMenuPriceFormatter(data ? data.currency : null),
    [data],
  );

  if (failed) {
    return (
      <main className="mx-auto min-h-screen max-w-2xl bg-white p-6 text-neutral-500">
        {t("previewError")}
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-neutral-900">
      {data?.truncated ? (
        <p className="bg-amber-100 px-5 py-2 text-center text-xs text-amber-900">
          {t("previewTruncated")}
        </p>
      ) : null}
      {blocks.length === 0 ? (
        <p className="px-5 py-16 text-center text-sm text-neutral-400">{t("previewEmpty")}</p>
      ) : (
        <MenuBlockList
          blocks={blocks}
          categoryMap={categoryMap}
          productsByCategory={productsByCategory}
          sizeOrderMap={sizeOrderMap}
          formatPrice={formatPrice}
        />
      )}
    </main>
  );
}
```

Nota sobre `categoryMap`: el endpoint ya filtró por `active === true`, así que acá se marca `active: true` para que `renderableBlocks` —que exige ese campo— no descarte todo. Una categoría que el endpoint no devolvió no está en el mapa, y `renderableBlocks` la descarta, que es exactamente el comportamiento del menú público.

- [ ] **Step 3: Verificar que compila y que la ruta hereda la protección del middleware**

```bash
npm run build
```

Esperado: `✓ Compiled successfully`, con `/[locale]/admin/[companyId]/menu/[tenantId]/preview` en la tabla.

```bash
grep -n "adminPanel" src/middleware.js
```

Esperado: el bloque que exige `isOwner` y `tokenCompanyId === adminPanel.companyId`. Como `resolveAdminPanelFromPath` solo mira los segmentos `admin/{companyId}`, la ruta nueva ya está cerrada sin tocar nada.

- [ ] **Step 4: Verificar el lint**

```bash
npx eslint --no-cache src
```

Esperado: `✖ 11 problems (4 errors, 7 warnings)`. Cualquier problema nuevo es de esta tarea.

- [ ] **Step 5: Commit**

```bash
git add "src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview" messages/es.json messages/en.json
git commit -m "feat(menu): ruta de vista previa del editor con protocolo postMessage"
```

---

### Task 7: El lienzo de bloques en el editor

Reemplaza las tres secciones de formulario por la lista de bloques con arrastre. En esta tarea el editor sigue guardando con el botón "Guardar borrador" contra el endpoint actual: el autoguardado y la partición de endpoints entran en la Task 9, juntos, para que el plan no deje la app rota a mitad de camino.

**Files:**
- Create: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/block-row.jsx`
- Create: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/block-canvas.jsx`
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes: todo lo de Task 3.
- Produces:
  - `BlockCanvas({ blocks, categoryLabels, availableCategoryRows, canAddHero, canAddFooter, onChange })` desde `./block-canvas`
    - `categoryLabels`: `Map<categoryId, string>` para el título de cada fila
    - `availableCategoryRows`: `Array<{id, label}>`, lo que devuelve `availableCategories`
    - `canAddHero`, `canAddFooter`: booleanos, lo que devuelve `canAddType`
    - `onChange(nextBlocks)`: el padre reemplaza su estado con la lista nueva
  - `BlockRow({ block, title, expanded, onToggleExpand, onPatch, onToggleVisible, onRemove })` desde `./block-row`

- [ ] **Step 1: Agregar las claves de traducción**

En `messages/es.json`, dentro de `OnlineMenu`:

```json
    "blocksTitle": "Bloques",
    "blocksHint": "Arrastrá para cambiar el orden. Solo los bloques visibles aparecen en el menú público.",
    "noBlocks": "Todavía no hay bloques. Agregá una portada o una categoría.",
    "addBlock": "Agregar",
    "addHero": "Portada",
    "addFooter": "Pie",
    "addCategoryGroup": "Categorías",
    "noCategoriesLeft": "Todas las categorías activas ya están en el menú.",
    "blockHero": "Portada",
    "blockFooter": "Pie",
    "dragHandle": "Arrastrar bloque",
    "hideBlock": "Ocultar bloque",
    "showBlock": "Mostrar bloque",
    "removeBlock": "Quitar bloque",
    "expandBlock": "Abrir o cerrar los campos del bloque",
    "hiddenBadge": "Oculto"
```

En `messages/en.json`, dentro de `OnlineMenu`:

```json
    "blocksTitle": "Blocks",
    "blocksHint": "Drag to reorder. Only visible blocks show up on the public menu.",
    "noBlocks": "No blocks yet. Add a header or a category.",
    "addBlock": "Add",
    "addHero": "Header",
    "addFooter": "Footer",
    "addCategoryGroup": "Categories",
    "noCategoriesLeft": "Every active category is already in the menu.",
    "blockHero": "Header",
    "blockFooter": "Footer",
    "dragHandle": "Drag block",
    "hideBlock": "Hide block",
    "showBlock": "Show block",
    "removeBlock": "Remove block",
    "expandBlock": "Open or close the block fields",
    "hiddenBadge": "Hidden"
```

- [ ] **Step 2: Crear la fila arrastrable**

Crear `src/app/[locale]/admin/[companyId]/menu/[tenantId]/block-row.jsx`:

```jsx
"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import { ChevronDown, Eye, EyeOff, GripVertical, Trash2 } from "lucide-react";

const inputClass =
  "w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-transparent";

function HeroFields({ data, onPatch }) {
  const t = useTranslations("OnlineMenu");
  return (
    <div className="space-y-2">
      <input
        value={data.title}
        onChange={(event) => onPatch({ title: event.target.value })}
        placeholder={t("heroTitleField")}
        className={inputClass}
      />
      <input
        value={data.subtitle}
        onChange={(event) => onPatch({ subtitle: event.target.value })}
        placeholder={t("heroSubtitleField")}
        className={inputClass}
      />
    </div>
  );
}

function FooterFields({ data, onPatch }) {
  const t = useTranslations("OnlineMenu");
  return (
    <div className="space-y-2">
      <input
        value={data.text}
        onChange={(event) => onPatch({ text: event.target.value })}
        placeholder={t("footerTextField")}
        className={inputClass}
      />
      <input
        value={data.address}
        onChange={(event) => onPatch({ address: event.target.value })}
        placeholder={t("footerAddressField")}
        className={inputClass}
      />
      <input
        value={data.phone}
        onChange={(event) => onPatch({ phone: event.target.value })}
        placeholder={t("footerPhoneField")}
        className={inputClass}
      />
    </div>
  );
}

function CategoryFields({ data, onPatch }) {
  const t = useTranslations("OnlineMenu");
  return (
    <div className="flex flex-wrap gap-4">
      <label className="flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={data.showPhotos}
          onChange={(event) => onPatch({ showPhotos: event.target.checked })}
        />
        {t("showPhotos")}
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-500">
        <input
          type="checkbox"
          checked={data.showDescriptions}
          onChange={(event) => onPatch({ showDescriptions: event.target.checked })}
        />
        {t("showDescriptions")}
      </label>
    </div>
  );
}

export function BlockRow({ block, title, expanded, onToggleExpand, onPatch, onToggleVisible, onRemove }) {
  const t = useTranslations("OnlineMenu");
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: block.id,
  });

  const hidden = block.visible === false;

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      className={`rounded-lg border bg-white dark:bg-[#0c1f30] ${
        isDragging ? "border-blue-400 shadow-lg" : "border-slate-200 dark:border-slate-800"
      } ${hidden ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2 px-2 py-2">
        <button
          type="button"
          className="cursor-grab touch-none p-1 text-slate-400"
          aria-label={t("dragHandle")}
          {...attributes}
          {...listeners}
        >
          <GripVertical className="size-4" />
        </button>

        <button
          type="button"
          onClick={onToggleExpand}
          aria-label={t("expandBlock")}
          aria-expanded={expanded}
          className="flex flex-1 items-center gap-2 text-left text-sm font-medium"
        >
          <ChevronDown className={`size-4 text-slate-400 ${expanded ? "" : "-rotate-90"}`} />
          {title}
          {hidden ? (
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
              {t("hiddenBadge")}
            </span>
          ) : null}
        </button>

        <button
          type="button"
          onClick={onToggleVisible}
          aria-label={hidden ? t("showBlock") : t("hideBlock")}
          className="p-1 text-slate-400 hover:text-slate-600"
        >
          {hidden ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>

        <button
          type="button"
          onClick={onRemove}
          aria-label={t("removeBlock")}
          className="p-1 text-slate-400 hover:text-red-500"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      {expanded ? (
        <div className="border-t border-slate-200 px-3 py-3 dark:border-slate-800">
          {block.type === "hero" ? <HeroFields data={block.data} onPatch={onPatch} /> : null}
          {block.type === "footer" ? <FooterFields data={block.data} onPatch={onPatch} /> : null}
          {block.type === "category" ? <CategoryFields data={block.data} onPatch={onPatch} /> : null}
        </div>
      ) : null}
    </li>
  );
}
```

- [ ] **Step 3: Crear el lienzo**

Crear `src/app/[locale]/admin/[companyId]/menu/[tenantId]/block-canvas.jsx`:

```jsx
"use client";

import { useState } from "react";
import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import {
  addBlock,
  moveBlock,
  removeBlock,
  toggleBlockVisibility,
  updateBlockData,
} from "@/lib/menu/menuBlockList";
import { BlockRow } from "./block-row";

export function BlockCanvas({ blocks, categoryLabels, availableCategoryRows, canAddHero, canAddFooter, onChange }) {
  const t = useTranslations("OnlineMenu");
  const [expandedId, setExpandedId] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const from = blocks.findIndex((block) => block.id === active.id);
    const to = blocks.findIndex((block) => block.id === over.id);
    onChange(moveBlock(blocks, from, to));
  };

  const titleFor = (block) => {
    if (block.type === "hero") {
      return t("blockHero");
    }
    if (block.type === "footer") {
      return t("blockFooter");
    }
    return categoryLabels.get(block.data.categoryId) || block.data.categoryId;
  };

  const add = (type, data) => {
    setMenuOpen(false);
    onChange(addBlock(blocks, type, data));
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-[#0c1f30]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            {t("blocksTitle")}
          </h2>
          <p className="text-xs text-slate-500">{t("blocksHint")}</p>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-700"
          >
            <Plus className="size-4" /> {t("addBlock")}
          </button>

          {menuOpen ? (
            <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg dark:border-slate-700 dark:bg-[#0c1f30]">
              <button
                type="button"
                disabled={!canAddHero}
                onClick={() => add("hero")}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                {t("addHero")}
              </button>
              <button
                type="button"
                disabled={!canAddFooter}
                onClick={() => add("footer")}
                className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 disabled:opacity-40 dark:hover:bg-slate-800"
              >
                {t("addFooter")}
              </button>

              <p className="mt-1 border-t border-slate-200 px-2 pt-2 text-[10px] uppercase tracking-wide text-slate-400 dark:border-slate-700">
                {t("addCategoryGroup")}
              </p>
              {availableCategoryRows.length === 0 ? (
                <p className="px-2 py-1.5 text-xs text-slate-400">{t("noCategoriesLeft")}</p>
              ) : (
                availableCategoryRows.map((category) => (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => add("category", { categoryId: category.id })}
                    className="block w-full rounded px-2 py-1.5 text-left text-sm hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    {category.label}
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
      </div>

      {blocks.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">{t("noBlocks")}</p>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          modifiers={[restrictToVerticalAxis]}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={blocks.map((block) => block.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="space-y-2">
              {blocks.map((block) => (
                <BlockRow
                  key={block.id}
                  block={block}
                  title={titleFor(block)}
                  expanded={expandedId === block.id}
                  onToggleExpand={() => setExpandedId(expandedId === block.id ? null : block.id)}
                  onPatch={(patch) => onChange(updateBlockData(blocks, block.id, patch))}
                  onToggleVisible={() => onChange(toggleBlockVisibility(blocks, block.id))}
                  onRemove={() => onChange(removeBlock(blocks, block.id))}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      )}
    </section>
  );
}
```

- [ ] **Step 4: Rewirear el editor**

En `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`:

1. Borrar `EMPTY_HERO`, `EMPTY_FOOTER`, `pickHero`, `pickFooter`, `buildCategoryRows` y `buildDraft`.
2. Borrar los estados `hero`, `footer` y `categories`, y las tres secciones de JSX de portada, categorías y pie.
3. Agregar los imports:

```js
import { availableCategories, canAddType } from "@/lib/menu/menuBlockList";
import { BlockCanvas } from "./block-canvas";
```

4. Reemplazar los estados borrados por:

```js
  const [blocks, setBlocks] = useState([]);
  const [categoryRows, setCategoryRows] = useState([]);
```

5. En el efecto de carga, borrar la línea `const blocks = readMenuBlocks(menuBody);` —ese nombre local ahora choca con el estado `blocks`— y reemplazar las tres llamadas `setHero(...)`, `setFooter(...)` y `setCategories(...)` por:

```js
        setBlocks(readMenuBlocks(menuBody));
        setCategoryRows(activeCategories);
```

`readMenuBlocks` ya existe y devuelve `menu.draft.blocks`. `setSlug` y `setPublishedAt` quedan como están.

6. Agregar los derivados, después de los estados:

```js
  const categoryLabels = useMemo(
    () => new Map(categoryRows.map((category) => [category.id, category.label])),
    [categoryRows],
  );
  const availableCategoryRows = useMemo(
    () => availableCategories(blocks, categoryRows),
    [blocks, categoryRows],
  );
```

7. Reemplazar el cuerpo de `saveDraft` para que mande `blocks` en vez de `buildDraft()`:

```js
        body: JSON.stringify({ menuSlug: slug, draft: { blocks } }),
```

8. Insertar el lienzo donde estaban las tres secciones:

```jsx
            <BlockCanvas
              blocks={blocks}
              categoryLabels={categoryLabels}
              availableCategoryRows={availableCategoryRows}
              canAddHero={canAddType(blocks, "hero")}
              canAddFooter={canAddType(blocks, "footer")}
              onChange={setBlocks}
            />
```

No tocar la sección del enlace, ni los botones, ni el manejo de alertas.

- [ ] **Step 5: Verificar**

```bash
npm test
```

Esperado: todo en verde, sin cambios de conteo.

```bash
npx eslint --no-cache src
```

Esperado: `✖ 11 problems (4 errors, 7 warnings)`. Si aparece un warning nuevo del React Compiler sobre alguno de los archivos nuevos, hay una condicional dentro de un `try`: sacarla a una función pura.

```bash
npm run build
```

Esperado: `✓ Compiled successfully`.

- [ ] **Step 6: Confirmar que el formulario viejo se fue**

```bash
grep -n "buildDraft\|pickHero\|pickFooter\|buildCategoryRows" "src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx"
```

Esperado: sin resultados.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/admin/[companyId]/menu/[tenantId]" messages/es.json messages/en.json
git commit -m "feat(menu): lienzo de bloques con arrastre en el editor"
```

---

### Task 8: Panel de vista previa

**Files:**
- Create: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview-panel.jsx`
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes: la ruta de Task 6 y su protocolo.
- Produces: `PreviewPanel({ previewUrl, blocks })` desde `./preview-panel`.

- [ ] **Step 1: Agregar las claves de traducción**

En `messages/es.json`, dentro de `OnlineMenu`:

```json
    "previewTitle": "Vista previa",
    "previewPhone": "Celular",
    "previewDesktop": "Escritorio"
```

En `messages/en.json`:

```json
    "previewTitle": "Preview",
    "previewPhone": "Phone",
    "previewDesktop": "Desktop"
```

- [ ] **Step 2: Crear el panel**

Crear `src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview-panel.jsx`:

```jsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Monitor, Smartphone } from "lucide-react";

const READY_MESSAGE = "menu-preview-ready";
const BLOCKS_MESSAGE = "menu-preview-blocks";
const PHONE_WIDTH = 390;

export function PreviewPanel({ previewUrl, blocks }) {
  const t = useTranslations("OnlineMenu");
  const frameRef = useRef(null);
  const blocksRef = useRef(blocks);
  const [phone, setPhone] = useState(false);

  const send = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !frame.contentWindow) {
      return;
    }
    // Nunca '*': el destino es siempre este mismo origen.
    frame.contentWindow.postMessage(
      { type: BLOCKS_MESSAGE, blocks: blocksRef.current },
      window.location.origin,
    );
  }, []);

  // Espera el "listo" de la previa antes del primer envio. Sin esto hay una
  // carrera: el padre puede mandar antes de que el iframe tenga su listener y
  // el primer dibujo sale vacio.
  useEffect(() => {
    function handleMessage(event) {
      if (event.origin !== window.location.origin) {
        return;
      }
      const message = event.data;
      if (!message || message.type !== READY_MESSAGE) {
        return;
      }
      send();
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [send]);

  // Sincroniza la ref y reenvia, en ese orden y en el mismo efecto. La lista
  // viaja por una ref ademas del estado porque el listener de "listo" y el
  // handler de "load" se registran una sola vez y necesitan leer la version mas
  // reciente sin volver a suscribirse. La asignacion va dentro de un efecto y no
  // en el cuerpo del componente: escribir una ref durante el render es
  // justamente lo que el compilador de React marca.
  useEffect(() => {
    blocksRef.current = blocks;
    send();
  }, [blocks, send]);

  return (
    <section className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          {t("previewTitle")}
        </h2>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setPhone(true)}
            aria-pressed={phone}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
              phone
                ? "border-blue-500 text-blue-500"
                : "border-slate-300 text-slate-500 dark:border-slate-700"
            }`}
          >
            <Smartphone className="size-3.5" /> {t("previewPhone")}
          </button>
          <button
            type="button"
            onClick={() => setPhone(false)}
            aria-pressed={!phone}
            className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${
              phone
                ? "border-slate-300 text-slate-500 dark:border-slate-700"
                : "border-blue-500 text-blue-500"
            }`}
          >
            <Monitor className="size-3.5" /> {t("previewDesktop")}
          </button>
        </div>
      </div>

      <div className="flex justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100 p-2 dark:border-slate-800 dark:bg-slate-900">
        <iframe
          ref={frameRef}
          src={previewUrl}
          title={t("previewTitle")}
          onLoad={send}
          style={phone ? { width: PHONE_WIDTH } : undefined}
          className={`h-[70vh] rounded-lg border-0 bg-white ${phone ? "" : "w-full"}`}
        />
      </div>
    </section>
  );
}
```

- [ ] **Step 3: Montar el panel en el editor**

En `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`:

1. Agregar el import:

```js
import { PreviewPanel } from "./preview-panel";
```

2. Cambiar el contenedor central de una a dos columnas. Reemplazar

```jsx
      <div className="mx-auto max-w-3xl space-y-6">
```

por

```jsx
      <div className="mx-auto max-w-7xl space-y-6">
```

3. Envolver el lienzo y el panel en la grilla de dos columnas. El `BlockCanvas` que la Task 7 insertó pasa a ser:

```jsx
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <BlockCanvas
                blocks={blocks}
                categoryLabels={categoryLabels}
                availableCategoryRows={availableCategoryRows}
                canAddHero={canAddType(blocks, "hero")}
                canAddFooter={canAddType(blocks, "footer")}
                onChange={setBlocks}
              />
              <PreviewPanel
                previewUrl={`/${locale}/admin/${companyId}/menu/${tenantId}/preview`}
                blocks={blocks}
              />
            </div>
```

`locale`, `companyId` y `tenantId` ya están definidos en el componente.

- [ ] **Step 4: Verificar**

```bash
npx eslint --no-cache src
```

Esperado: `✖ 11 problems (4 errors, 7 warnings)`.

```bash
npm run build
```

Esperado: `✓ Compiled successfully`.

- [ ] **Step 5: Verificar que ningún `postMessage` usa comodín**

```bash
grep -rn "postMessage(" src/ | grep -v "window.location.origin"
```

Esperado: sin resultados. Un `postMessage(..., '*')` acá manda el contenido del menú a cualquier documento que llegue a estar en ese `iframe`.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/admin/[companyId]/menu/[tenantId]" messages/es.json messages/en.json
git commit -m "feat(menu): panel de vista previa en vivo con selector de ancho"
```

---

### Task 9: Autoguardado, enlace aparte y aviso de pantalla angosta

La última pieza, y la que toca servidor y cliente a la vez: partir el `PUT` en dos y conectar el autoguardado.

**Files:**
- Create: `src/app/api/company/sedes/[tenantId]/menu/slug/route.js`
- Modify: `src/app/api/company/sedes/[tenantId]/menu/route.js`
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`
- Modify: `messages/es.json`
- Modify: `messages/en.json`

**Interfaces:**
- Consumes: `createAutosave` de Task 4.
- Produces:
  - `PUT /api/company/sedes/<tenantId>/menu` con cuerpo `{ draft: { blocks } }` → `{ menu }`. Ya no acepta ni lee `menuSlug`, y ya no revalida.
  - `PUT /api/company/sedes/<tenantId>/menu/slug` con cuerpo `{ menuSlug }` → `{ menuSlug }`.

- [ ] **Step 1: Dejar `PUT /menu` con una sola responsabilidad**

En `src/app/api/company/sedes/[tenantId]/menu/route.js`:

1. Borrar los imports que dejan de usarse: `revalidatePath`, `MENU_SLUG_ERRORS`, `normalizeMenuSlug`, `validateMenuSlug`, `assignMenuSlug`, `normalizeMenuDocument`, y las constantes `SLUG_ASSIGN_ERROR_STATUS` y `statusForSlugAssignError`.
2. Reemplazar la función `PUT` entera por:

```js
// Guarda solo el borrador. El slug se mueve por PUT /menu/slug, en su propia
// ruta: mezclarlos obligaba a distinguir "menuSlug ausente" de "menuSlug vacio"
// en cada llamada del autoguardado, y equivocarse en esa distincion mueve una
// URL publica sin que nadie lo haya pedido. Un QR impreso no se reemite.
//
// Tampoco revalida: la pagina publica renderiza menu.published, asi que guardar
// un borrador no cambia una sola respuesta cacheada. Revalidar en cada pausa de
// tecleo tiraria la cache de un menu que no cambio.
export async function PUT(req, { params }) {
  try {
    const { tenantId } = await params;
    const { sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    const body = await req.json().catch(() => ({}));

    const conn = await getTenantConnection(sede.dbName);
    const current = await readMenuDocument(conn);
    const saved = await writeMenuDocument(conn, {
      ...current,
      draft: normalizeMenuDraft(body?.draft),
    });

    return NextResponse.json({ tenant: sedeSummary(sede), menu: saved });
  } catch (error) {
    return errorResponse(error, 'Failed to save menu');
  }
}
```

El `GET` no cambia.

- [ ] **Step 2: Crear la ruta del slug**

Crear `src/app/api/company/sedes/[tenantId]/menu/slug/route.js`:

```js
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { MENU_SLUG_ERRORS, normalizeMenuSlug, validateMenuSlug } from '@/lib/menu/menuSlug';
import { assignMenuSlug } from '@/lib/menu/menuTenant';

// Mapa explicito: assignMenuSlug puede fallar por mas de un motivo y cada uno
// pesa distinto en HTTP. Un codigo nuevo que no se agregue aqui cae al 500 (y
// se enmascara abajo), en vez de heredar el 409 de slug_taken sin que aplique.
const SLUG_ASSIGN_ERROR_STATUS = Object.freeze({
  [MENU_SLUG_ERRORS.TAKEN]: 409,
  [MENU_SLUG_ERRORS.INVALID]: 400,
  tenant_not_found: 404,
});

function statusForSlugAssignError(code) {
  return SLUG_ASSIGN_ERROR_STATUS[code] || 500;
}

export async function PUT(req, { params }) {
  try {
    const { tenantId } = await params;
    const { masterConn, sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    const body = await req.json().catch(() => ({}));

    const slugError = validateMenuSlug(body?.menuSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    const assigned = await assignMenuSlug(masterConn, sede.tenantId, body.menuSlug);
    if (!assigned.ok) {
      const status = statusForSlugAssignError(assigned.error);
      return NextResponse.json(
        { error: status === 500 ? 'Failed to save link' : assigned.error },
        { status },
      );
    }

    // El slug viejo queda apuntando a una ruta que ya no existe: si no se
    // revalida, sigue sirviendo el menu desde la cache.
    const previousSlug = sede.menuSlug || '';
    const nextSlug = normalizeMenuSlug(body.menuSlug);
    if (previousSlug && previousSlug !== nextSlug) {
      revalidatePath(`/m/${previousSlug}`);
    }
    revalidatePath(`/m/${nextSlug}`);

    return NextResponse.json({ menuSlug: nextSlug });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to save link' : error.message },
      { status },
    );
  }
}
```

- [ ] **Step 3: Agregar las claves de traducción**

En `messages/es.json`, dentro de `OnlineMenu`:

```json
    "statusSaving": "Guardando…",
    "statusSaved": "Guardado",
    "statusError": "No se pudo guardar.",
    "retry": "Reintentar",
    "saveLink": "Guardar enlace",
    "linkSaved": "Enlace guardado.",
    "narrowScreen": "Este editor necesita una pantalla más ancha."
```

En `messages/en.json`:

```json
    "statusSaving": "Saving…",
    "statusSaved": "Saved",
    "statusError": "Couldn't save.",
    "retry": "Retry",
    "saveLink": "Save link",
    "linkSaved": "Link saved.",
    "narrowScreen": "This editor needs a wider screen."
```

Y borrar de los dos archivos las claves que dejan de usarse: `saveDraft`, `saving`, `draftSaved`, `include`, `order`, `categoriesTitle`, `categoriesHint`, `noCategories`, `heroTitle`, `footerTitle`.

Comprobar antes de borrar cada una:

```bash
grep -rn "\"saveDraft\"\|\"saving\"\|\"draftSaved\"\|\"include\"\|\"order\"\|\"categoriesTitle\"\|\"categoriesHint\"\|\"noCategories\"\|\"heroTitle\"\|\"footerTitle\"" src/
```

Esperado: sin resultados fuera de `messages/`. Si alguna aparece en `src/`, todavía se usa y no se borra.

- [ ] **Step 4: Conectar el autoguardado en el editor**

En `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`:

1. Agregar los imports:

```js
import { useEffect, useMemo, useRef, useState } from "react";
import { createAutosave } from "@/lib/menu/createAutosave";
```

2. Reemplazar el estado `saving` por `saveStatus`, y agregar el flag que evita autoguardar la carga inicial:

```js
  const [saveStatus, setSaveStatus] = useState("idle");
  const loadedRef = useRef(false);
```

3. Reemplazar la función `saveDraft` entera por el autoguardado. Va después de los estados, antes del `return`:

```js
  // Se crea una sola vez con el inicializador perezoso de useState: recrearlo
  // en cada render perderia el temporizador y la cola. No se usa una ref con
  // asignacion condicional porque eso escribe la ref durante el render, que es
  // justamente lo que el compilador de React marca. `tenantId` sale de la ruta
  // y no cambia sin desmontar la pagina, asi que capturarlo aca es seguro.
  const [autosave] = useState(() =>
    createAutosave({
      save: async (draft) => {
        const res = await fetch(`/api/company/sedes/${tenantId}/menu`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ draft }),
        });
        if (!res.ok) {
          throw new Error("save_failed");
        }
      },
      onStatusChange: setSaveStatus,
    }),
  );

  // Cada cambio de la lista programa un guardado. El guard de la primera vez
  // evita que el propio render inicial —el que acaba de leer del servidor—
  // dispare un PUT que reescribiria lo mismo.
  useEffect(() => {
    if (!loadedRef.current) {
      return;
    }
    autosave.schedule({ blocks });
  }, [blocks, autosave]);

  // Aviso al cerrar la pestaña con cambios sin guardar. Es lo unico que separa
  // "acomode el menu diez minutos" de "perdi diez minutos".
  useEffect(() => {
    function handleBeforeUnload(event) {
      if (!autosave.hasPending()) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [autosave]);
```

4. Al final del efecto de carga, después de `setCategoryRows(activeCategories)`, marcar la carga como terminada:

```js
        loadedRef.current = true;
```

5. Reemplazar `publish` entera. Es la misma que ya existe, con la única diferencia de que vacía la cola del autoguardado en vez de llamar a `saveDraft`:

```js
  const publish = async () => {
    // Publicar vacia primero la cola: publicar con un cambio todavia dentro del
    // debounce publicaria la version anterior, que es lo contrario de lo que el
    // boton dice.
    const flushed = await autosave.flush();
    if (!flushed) {
      return;
    }

    setPublishing(true);
    try {
      const res = await fetch(`/api/company/sedes/${tenantId}/menu/publish`, {
        method: "POST",
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = readErrorCode(body);
        setAlert({ type: "error", message: errorText(code, "publishError") });
        setPublishing(false);
        return;
      }
      setPublishedAt(readPublishedAt(body));
      setAlert({ type: "success", message: t("published") });
      setPublishing(false);
    } catch {
      setAlert({ type: "error", message: t("publishError") });
      setPublishing(false);
    }
  };
```

6. Agregar el guardado explícito del enlace:

```js
  const saveLink = async () => {
    setAlert(null);
    try {
      const res = await fetch(`/api/company/sedes/${tenantId}/menu/slug`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuSlug: slug }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = readErrorCode(body);
        setAlert({ type: "error", message: errorText(code, "saveError") });
        return;
      }
      setSlug(readMenuSlug(body));
      setAlert({ type: "success", message: t("linkSaved") });
    } catch {
      setAlert({ type: "error", message: t("saveError") });
    }
  };
```

7. En la sección del enlace, agregar el botón después del párrafo de advertencia:

```jsx
              <button
                type="button"
                onClick={saveLink}
                className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium dark:border-slate-700"
              >
                {t("saveLink")}
              </button>
```

8. Reemplazar el botón "Guardar borrador" por el indicador de estado:

```jsx
                {saveStatus === "saving" ? (
                  <span className="text-xs text-slate-500">{t("statusSaving")}</span>
                ) : null}
                {saveStatus === "saved" ? (
                  <span className="text-xs text-emerald-600">{t("statusSaved")}</span>
                ) : null}
                {saveStatus === "error" ? (
                  <span className="flex items-center gap-2 text-xs text-red-500">
                    {t("statusError")}
                    <button
                      type="button"
                      onClick={() => autosave.retry()}
                      className="underline"
                    >
                      {t("retry")}
                    </button>
                  </span>
                ) : null}
```

9. Reemplazar `const busy = saving || publishing;` por `const busy = publishing;`.

10. Agregar el aviso de pantalla angosta como primer hijo del contenedor central:

```jsx
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-700 lg:hidden">
          {t("narrowScreen")}
        </p>
```

- [ ] **Step 5: Verificar**

```bash
npm test
```

Esperado: todo en verde.

```bash
npx eslint --no-cache src
```

Esperado: `✖ 11 problems (4 errors, 7 warnings)`.

```bash
npm run build
```

Esperado: `✓ Compiled successfully`, con `ƒ /api/company/sedes/[tenantId]/menu/slug` en la tabla.

- [ ] **Step 6: Confirmar que el editor ya no manda el slug al endpoint del borrador**

```bash
grep -n "menuSlug" "src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx"
```

Esperado: solo dentro de `saveLink` y de `readMenuSlug`. Ninguna aparición en el cuerpo del `save` del autoguardado.

```bash
grep -n "menuSlug\|revalidatePath" "src/app/api/company/sedes/[tenantId]/menu/route.js"
```

Esperado: sin resultados. Si alguno sobrevive, `PUT /menu` sigue teniendo dos responsabilidades.

- [ ] **Step 7: Confirmar que no quedaron claves de traducción huérfanas**

```bash
node -e "
const es = require('./messages/es.json').OnlineMenu;
const en = require('./messages/en.json').OnlineMenu;
const missing = Object.keys(es).filter((k) => !(k in en));
const extra = Object.keys(en).filter((k) => !(k in es));
console.log('solo en es:', missing);
console.log('solo en en:', extra);
"
```

Esperado: dos arreglos vacíos.

- [ ] **Step 8: Commit**

```bash
git add "src/app/api/company/sedes/[tenantId]/menu" "src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx" messages/es.json messages/en.json
git commit -m "feat(menu): autoguardado del borrador y enlace publico en su propia ruta"
```

---

### Task 10: Verificación final

**Files:** ninguno. Esta tarea no escribe código.

- [ ] **Step 1: Suite completa**

```bash
npm test
```

Esperado: verde. El sub-proyecto empezó con 81 tests y agrega 49 (7 de `groupProductsBySize`, 28 de `menuBlockList`, 14 de `createAutosave`), así que el total esperado es **130**. Un número distinto significa que algún archivo de test no se está recogiendo.

- [ ] **Step 2: Lint**

```bash
npx eslint --no-cache src
```

Esperado: exactamente `✖ 11 problems (4 errors, 7 warnings)`, la base preexistente del repo.

- [ ] **Step 3: Build**

```bash
npm run build
```

Esperado: `✓ Compiled successfully`. Confirmar en la tabla de rutas:
- `● /m/[slug]` — el `●` es el ISR; un `ƒ` significa que la página pública dejó de cachearse
- `ƒ /api/company/sedes/[tenantId]/menu/preview-data`
- `ƒ /api/company/sedes/[tenantId]/menu/slug`
- `/[locale]/admin/[companyId]/menu/[tenantId]/preview`

- [ ] **Step 4: Repaso de seguridad**

```bash
grep -rn "postMessage(" src/
```

Cada emisión tiene que llevar `window.location.origin` como segundo argumento, y cada receptor tiene que comparar `event.origin` contra `window.location.origin` antes de mirar el mensaje.

```bash
grep -rn "requireOwnerSede" src/app/api/company/sedes/
```

Las cinco rutas de menú (`menu`, `menu/slug`, `menu/publish`, `menu/categories`, `menu/preview-data`) tienen que pasar `'online-menu'` como tercer argumento.

- [ ] **Step 5: Checklist manual en el navegador**

Requiere sesión de dueño con el módulo activado. Ninguno de estos puntos se puede automatizar en este trabajo.

1. Arrastrar una categoría de la última posición a la primera; la previa se reordena sin recargar.
2. Ocultar un bloque; se atenúa en la lista y desaparece de la previa.
3. Quitar una categoría; vuelve a aparecer en el menú "Agregar".
4. Agregar portada cuando ya existe una: la opción está deshabilitada.
5. Editar el título de la portada; la previa lo refleja al tipear.
6. Esperar sin tocar nada: el indicador pasa a "Guardado". Recargar y comprobar que el orden se conservó.
7. Arrastrar varias veces rápido y recargar: el orden guardado es el último que se ve en pantalla.
8. Cortar la red y mover un bloque: aparece el aviso con "Reintentar"; con la red de vuelta, el reintento guarda.
9. Cerrar la pestaña con un cambio recién hecho: el navegador advierte.
10. Botón "Celular": la previa se angosta a 390 px.
11. Publicar; abrir `/m/<slug>` en ventana privada y comprobar que el orden coincide con el del editor.
12. Cambiar el enlace desde su sección; el enlace viejo deja de servir el menú y el nuevo lo sirve.
13. Achicar la ventana por debajo de 1024 px: aparece el aviso de pantalla angosta.
14. **Regresión de la página pública**: abrir un menú ya publicado desde antes de esta rama y comprobar que renderiza igual. La Task 2 movió los componentes de presentación y esa es la única forma de comprobar que la mudanza no cambió nada.

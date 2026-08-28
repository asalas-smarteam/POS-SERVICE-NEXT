# Menú en línea 1b‑2 — presentación · Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que el dueño elija por bloque cómo se presenta cada categoría del menú en línea — cuatro variantes de tamaños más doble columna — sin que ningún menú ya publicado cambie.

**Architecture:** Dos campos nuevos en `block.data` (`variant`, `columns`) cuyos defaults reproducen el render actual. La regla de precios no uniformes vive en un módulo puro que usan la vista previa y el menú público a través del mismo `MenuBlockList`. La carga de datos de la previa sube del iframe al editor, que es lo que le permite avisar con esa misma regla en vez de con una segunda implementación.

**Tech Stack:** Next.js 16 App Router, React 19 con React Compiler, Tailwind v4, next-intl (`es`/`en`), Vitest (`environment: "node"`, alias `@` → `src/app`), Mongoose.

**Spec:** `docs/superpowers/specs/2026-08-28-online-menu-presentation-design.md`

## Global Constraints

- **Ningún cliente puede ver un precio que su plato no tiene.** Es la restricción que manda sobre todo lo demás. Si una presentación no puede mostrar un precio con su etiqueta correcta, muestra el precio igual (sin etiqueta) antes que omitirlo, y nunca lo muestra bajo la etiqueta de otro.
- **`MENU_SCHEMA_VERSION` se queda en 1.** No se toca. Los defaults son toda la garantía de compatibilidad.
- **Un menú publicado antes de esta rama tiene que renderizar idéntico.** Cualquier cambio que rompa eso es un defecto, no una mejora.
- **El compilador de React no soporta condicionales, `??`, `?.` ni operadores lógicos dentro de un `try`/`catch`.** Si aparecen ahí, deja al componente entero sin compilar y sin avisar en el build. El parseo de respuestas va en funciones puras afuera del `try`; dentro del `try` solo llamadas y asignaciones planas.
- **No se escriben refs durante el render.** El compilador lo marca.
- **`postMessage` valida el origen en las dos direcciones y nunca usa `'*'`.**
- **Base de partida:** `npm test` → 162 pruebas, 10 archivos. `npx eslint --no-cache src` → `✖ 11 problems (4 errors, 7 warnings)`, todos preexistentes. Ninguno de los dos números puede empeorar.
- **No hay pruebas de componentes.** El repo corre Vitest en `environment: "node"`, sin jsdom ni testing-library, y no hay pruebas de rutas API. No se monta infraestructura nueva de test en este plan.
- **Idioma del código:** comentarios y nombres de prueba en español sin tildes (el repo lo hace así en `src/`); los textos de interfaz sí llevan tildes y van en `messages/es.json` y `messages/en.json`.

---

### Task 1: Catálogo de variantes

**Files:**
- Create: `src/app/lib/menu/menuVariants.js`
- Test: `src/app/lib/menu/menuVariants.test.js`

**Interfaces:**
- Consumes: nada.
- Produces: `MENU_VARIANTS: readonly string[]`, `DEFAULT_VARIANT: "sizeRows"`, `normalizeVariant(value): string`, `variantsForCategory(hasSizes): string[]`, `supportsColumns(variant): boolean`.

- [ ] **Step 1: Escribir la prueba que falla**

Crear `src/app/lib/menu/menuVariants.test.js`:

```js
import { describe, expect, it } from "vitest";
import {
  DEFAULT_VARIANT,
  MENU_VARIANTS,
  normalizeVariant,
  supportsColumns,
  variantsForCategory,
} from "@/lib/menu/menuVariants";

describe("normalizeVariant", () => {
  it("acepta las cuatro variantes del catalogo", () => {
    expect(MENU_VARIANTS).toEqual(["sizeRows", "priceColumns", "sizeTable", "sizeBadges"]);
    for (const variant of MENU_VARIANTS) {
      expect(normalizeVariant(variant)).toBe(variant);
    }
  });

  it("cae al default con un valor desconocido", () => {
    expect(normalizeVariant("tarjetas")).toBe(DEFAULT_VARIANT);
  });

  // normalizeBlock corre sobre el body de una request arbitraria, asi que el
  // valor puede no ser ni siquiera un string.
  it("cae al default con valores que no son string", () => {
    for (const value of [undefined, null, 3, {}, ["sizeTable"], true]) {
      expect(normalizeVariant(value)).toBe(DEFAULT_VARIANT);
    }
  });

  // El default no es una eleccion de estilo: es lo unico que hace que un menu
  // publicado antes de 1b-2 salga identico sin migracion.
  it("el default es la presentacion que ya se renderizaba", () => {
    expect(DEFAULT_VARIANT).toBe("sizeRows");
  });
});

describe("variantsForCategory", () => {
  it("ofrece el catalogo completo en una categoria con talles", () => {
    expect(variantsForCategory(true)).toEqual(MENU_VARIANTS);
  });

  it("no ofrece nada en una categoria sin talles", () => {
    expect(variantsForCategory(false)).toEqual([]);
  });

  // hasSizes sale de un ajuste Mixed de mongo: puede venir ausente o mal
  // escrito, y ahi la respuesta segura es no ofrecer un selector que no aplica.
  it("no ofrece nada con un hasSizes que no es booleano", () => {
    for (const value of [undefined, null, "true", 1, {}]) {
      expect(variantsForCategory(value)).toEqual([]);
    }
  });
});

describe("supportsColumns", () => {
  it("niega la doble columna solo en priceColumns", () => {
    expect(supportsColumns("priceColumns")).toBe(false);
    expect(supportsColumns("sizeRows")).toBe(true);
    expect(supportsColumns("sizeTable")).toBe(true);
    expect(supportsColumns("sizeBadges")).toBe(true);
  });

  it("un valor desconocido se juzga por el default, que si la admite", () => {
    expect(supportsColumns("loquesea")).toBe(true);
  });
});
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run src/app/lib/menu/menuVariants.test.js`
Expected: FAIL — `Failed to resolve import "@/lib/menu/menuVariants"`.

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/app/lib/menu/menuVariants.js`:

```js
// Las variantes de presentacion del bloque de categoria. Viven en su propio
// modulo y no en menuSchema.js porque son dos consumidores con necesidades
// distintas: el editor necesita el CATALOGO para armar el select, el
// renderizador necesita solo despachar. Metidas en el esquema, la pagina
// publica importaria tambien la logica de "que le ofrezco al dueno".
export const MENU_VARIANTS = Object.freeze([
  "sizeRows",
  "priceColumns",
  "sizeTable",
  "sizeBadges",
]);

// Reproduce exactamente lo que el renderizador hacia antes de 1b-2. Es toda la
// garantia de compatibilidad de los menus ya publicados: un bloque guardado sin
// `variant` tiene que salir identico, y por eso MENU_SCHEMA_VERSION se pudo
// quedar en 1 sin migracion. No cambiar sin una migracion que lo acompane.
export const DEFAULT_VARIANT = "sizeRows";

export function normalizeVariant(value) {
  return MENU_VARIANTS.includes(value) ? value : DEFAULT_VARIANT;
}

// Una categoria sin talles no tiene nada que elegir: las cuatro variantes se
// distinguen justamente por como muestran los talles. Lo usa el editor para
// decidir si dibuja el select; el renderizador no lo consulta, porque ya
// despacha por `hasSizes`.
//
// La comparacion es estricta (=== true) igual que en renderableBlocks: hasSizes
// sale de un ajuste Mixed y un flag ausente o mal escrito no debe alcanzar para
// ofrecer un selector que despues no aplica.
export function variantsForCategory(hasSizes) {
  return hasSizes === true ? [...MENU_VARIANTS] : [];
}

// priceColumns alinea los precios de cada talle a lo ancho de la seccion.
// Partida en dos columnas deja cuatro numeros en ~110px de un celular y se
// vuelve ilegible, asi que el editor esconde el control en vez de ofrecerlo e
// ignorarlo despues. Un valor desconocido se juzga por el default, que si la
// admite: normalizeVariant ya lo convirtio.
export function supportsColumns(variant) {
  return normalizeVariant(variant) !== "priceColumns";
}
```

- [ ] **Step 4: Correr la prueba para verificar que pasa**

Run: `npx vitest run src/app/lib/menu/menuVariants.test.js`
Expected: PASS — 9 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/menu/menuVariants.js src/app/lib/menu/menuVariants.test.js
git commit -m "feat(menu): agregar el catalogo de variantes de presentacion"
```

---

### Task 2: `groupProductsBySize` emite la identidad del talle

Hoy su salida lleva `{ id, label, price }` donde `id` es el id del **producto**. La identidad del talle se pierde en el camino, y sin ella no se puede agrupar por talle para armar la tabla de la Task 3.

**Files:**
- Modify: `src/app/lib/menu/groupProductsBySize.js`
- Test: `src/app/lib/menu/groupProductsBySize.test.js` (existente — las expectativas actuales cambian)

**Interfaces:**
- Consumes: nada.
- Produces: cada entrada de `dish.sizes` pasa a ser `{ id, sizeId, label, price }`. `sizeId` es el id del talle **solo si resuelve** en `sizeOrderMap`; si el talle fue borrado o desactivado, es `null` (y `label` sigue siendo `""`, como hoy). Las Tasks 3 y 6 dependen de ese contrato.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/app/lib/menu/groupProductsBySize.test.js`, agregar dentro del `describe("groupProductsBySize", ...)` existente:

```js
  it("emite el sizeId de cada talle que resuelve en el ajuste", () => {
    const result = groupProductsBySize(
      [
        product({ id: "a", sizeId: "s3", price: 3000 }),
        product({ id: "b", sizeId: "s1", price: 1000 }),
      ],
      sizeOrder,
    );

    expect(result[0].sizes.map((size) => size.sizeId)).toEqual(["s1", "s3"]);
  });

  // Sin identidad de talle no se puede agrupar por talle. El precio igual se
  // muestra -perder un precio de un menu publico es peor que mostrarlo sin
  // etiqueta- pero el consumidor tiene que poder distinguirlo, y para eso
  // alcanza con este null: no hace falta que vuelva a consultar sizeOrderMap.
  it("deja el sizeId en null cuando el talle no resuelve", () => {
    const result = groupProductsBySize([product({ sizeId: "borrado" })], sizeOrder);

    expect(result[0].sizes).toEqual([
      { id: "p1", sizeId: null, label: "", price: 1000 },
    ]);
  });

  it("deja el sizeId en null cuando el producto no tiene talle", () => {
    const result = groupProductsBySize([product({ sizeId: null })], sizeOrder);

    expect(result[0].sizes[0].sizeId).toBeNull();
  });
```

Y actualizar las expectativas exactas de las pruebas existentes que comparan `sizes` (o un objeto de talle) con `toEqual`, agregando `sizeId` a cada entrada. En `"agrupa los productos del mismo nombre en un plato con varias filas"` queda:

```js
    expect(result[0].sizes).toEqual([
      { id: "b", sizeId: "s1", label: "Pequeña", price: 1000 },
      { id: "a", sizeId: "s2", label: "Mediana", price: 2000 },
    ]);
```

Recorrer el archivo entero: `toEqual` es exacto y el campo nuevo rompe toda aserción de ese tipo, no solo esa.

- [ ] **Step 2: Correr las pruebas para verificar que fallan**

Run: `npx vitest run src/app/lib/menu/groupProductsBySize.test.js`
Expected: FAIL — las nuevas por `sizeId: undefined` en vez del valor esperado.

- [ ] **Step 3: Escribir la implementación mínima**

En `src/app/lib/menu/groupProductsBySize.js`, reemplazar el `sizes:` del `return` por:

```js
      // `id` es el del producto y sirve de key de React; `sizeId` es la
      // identidad del talle, y va en null cuando no resuelve en el ajuste
      // (borrado o desactivado). Se resuelve aca y no en el consumidor para que
      // nadie tenga que volver a consultar sizeOrderMap solo para saber si
      // puede confiar en la etiqueta: null y label "" cuentan la misma
      // historia, y salen del mismo lugar.
      sizes: sorted.map((product) => ({
        id: product.id,
        sizeId: sizeOrderMap.has(product.sizeId) ? product.sizeId : null,
        label: sizeOrderMap.get(product.sizeId)?.label ?? "",
        price: product.price,
      })),
```

- [ ] **Step 4: Correr las pruebas para verificar que pasan**

Run: `npx vitest run src/app/lib/menu/groupProductsBySize.test.js`
Expected: PASS — 10 pruebas (las 7 de antes más 3 nuevas).

- [ ] **Step 5: Correr la suite completa**

Run: `npm test`
Expected: PASS — 174 pruebas, 11 archivos.

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/menu/groupProductsBySize.js src/app/lib/menu/groupProductsBySize.test.js
git commit -m "feat(menu): exponer la identidad del talle en groupProductsBySize"
```

---

### Task 3: La regla de precios no uniformes

**Files:**
- Create: `src/app/lib/menu/sizePriceTable.js`
- Test: `src/app/lib/menu/sizePriceTable.test.js`

**Interfaces:**
- Consumes: la salida de `groupProductsBySize` de la Task 2 — `[{ id, name, description, image, sizes: [{ id, sizeId, label, price }] }]`, con los talles ya ordenados por el orden del ajuste y los que no resuelven al final con `sizeId: null`.
- Produces:
  - `buildSizePriceTable(dishes, sizeOrderMap)` → `{ sizes: [{ sizeId, label, price }], dishes: [{ id, name, description, image, sizes, isException }], fellBack: boolean }`. `dishes` sale **en el mismo orden que entró**, cada plato con su bandera: el renderizador no reordena el menú.
  - `sizeColumnsOf(dishes, sizeOrderMap)` → `[{ sizeId, label }]`, los talles que resuelven y aparecen en al menos un plato, en el orden del ajuste. Lo usa `priceColumns` para sus encabezados.

- [ ] **Step 1: Escribir las pruebas que fallan**

Crear `src/app/lib/menu/sizePriceTable.test.js`:

```js
import { describe, expect, it } from "vitest";
import { buildSizePriceTable, sizeColumnsOf } from "@/lib/menu/sizePriceTable";

const sizeOrder = new Map([
  ["s1", { label: "Pequeña", order: 0 }],
  ["s2", { label: "Mediana", order: 1 }],
  ["s3", { label: "Grande", order: 2 }],
  ["s4", { label: "Jumbo", order: 3 }],
]);

// Misma forma que devuelve groupProductsBySize: los talles ya vienen ordenados
// por el orden del ajuste y el que no resuelve trae sizeId null.
const dish = (name, entries) => ({
  id: `d-${name}`,
  name,
  description: "",
  image: null,
  sizes: entries.map(([sizeId, price]) => ({
    id: `${name}-${sizeId}`,
    sizeId: sizeOrder.has(sizeId) ? sizeId : null,
    label: sizeOrder.has(sizeId) ? sizeOrder.get(sizeId).label : "",
    price,
  })),
});

const uniform = (name) => dish(name, [["s1", 1000], ["s2", 2000], ["s3", 3000]]);
const many = (count) => Array.from({ length: count }, (_, index) => uniform(`p${index}`));
const exceptionsOf = (result) => result.dishes.filter((entry) => entry.isException);

describe("buildSizePriceTable", () => {
  it("con una lista vacia no arma tabla", () => {
    const result = buildSizePriceTable([], sizeOrder);

    expect(result.sizes).toEqual([]);
    expect(result.dishes).toEqual([]);
    expect(result.fellBack).toBe(true);
  });

  it("con precios uniformes arma la tabla y no deja excepciones", () => {
    const result = buildSizePriceTable(many(4), sizeOrder);

    expect(result.sizes).toEqual([
      { sizeId: "s1", label: "Pequeña", price: 1000 },
      { sizeId: "s2", label: "Mediana", price: 2000 },
      { sizeId: "s3", label: "Grande", price: 3000 },
    ]);
    expect(exceptionsOf(result)).toHaveLength(0);
    expect(result.fellBack).toBe(false);
  });

  it("el plato que difiere en un precio es la unica excepcion y la tabla queda intacta", () => {
    const especial = dish("especial", [["s1", 1000], ["s2", 2000], ["s3", 4500]]);
    const result = buildSizePriceTable([...many(4), especial], sizeOrder);

    expect(result.sizes.map((size) => size.price)).toEqual([1000, 2000, 3000]);
    expect(exceptionsOf(result).map((entry) => entry.name)).toEqual(["especial"]);
    expect(result.fellBack).toBe(false);
  });

  it("devuelve los platos en el orden en que llegaron", () => {
    const especial = dish("especial", [["s1", 1000], ["s2", 2000], ["s3", 4500]]);
    const result = buildSizePriceTable([uniform("a"), especial, uniform("b")], sizeOrder);

    expect(result.dishes.map((entry) => entry.name)).toEqual(["a", "especial", "b"]);
  });

  // Un empate no se desempata por precio mas bajo ni por orden de aparicion:
  // las dos reglas elegirian un numero que la mitad de los platos no cobra.
  it("un talle con empate en el precio mas frecuente no entra en la tabla", () => {
    const result = buildSizePriceTable(
      [
        dish("a", [["s1", 1000], ["s2", 2000], ["s3", 3000]]),
        dish("b", [["s1", 1000], ["s2", 2000], ["s3", 3000]]),
        dish("c", [["s1", 1500], ["s2", 2000], ["s3", 3000]]),
        dish("d", [["s1", 1500], ["s2", 2000], ["s3", 3000]]),
      ],
      sizeOrder,
    );

    expect(result.sizes.map((size) => size.sizeId)).toEqual(["s2", "s3"]);
  });

  it("cae cuando las excepciones superan a los platos que calzan", () => {
    const result = buildSizePriceTable(
      [
        uniform("a"),
        uniform("b"),
        dish("c", [["s1", 1100], ["s2", 2000], ["s3", 3000]]),
        dish("d", [["s1", 1200], ["s2", 2000], ["s3", 3000]]),
        dish("e", [["s1", 1300], ["s2", 2000], ["s3", 3000]]),
      ],
      sizeOrder,
    );

    expect(result.fellBack).toBe(true);
  });

  it("el plato al que le falta un talle de la tabla es excepcion, y la tabla sigue en pie", () => {
    const familiar = dish("familiar", [["s3", 5000]]);
    const result = buildSizePriceTable([...many(4), familiar], sizeOrder);

    expect(result.sizes).toHaveLength(3);
    expect(exceptionsOf(result).map((entry) => entry.name)).toEqual(["familiar"]);
    expect(result.fellBack).toBe(false);
  });

  it("el plato con un talle que no resuelve es excepcion", () => {
    const raro = dish("raro", [["s1", 1000], ["s2", 2000], ["s3", 3000], ["borrado", 9000]]);
    const result = buildSizePriceTable([...many(4), raro], sizeOrder);

    expect(exceptionsOf(result).map((entry) => entry.name)).toEqual(["raro"]);
    expect(result.fellBack).toBe(false);
  });

  // El caso que se escapa solo. Sin el piso de mayoria, "Jumbo" entra en la
  // tabla con el precio del unico plato que lo tiene -con un solo dato no hay
  // empate que lo frene-, los otros diez pasan a excepcion por FALTARLES ese
  // talle, y la tabla se cae en un menu que no tenia nada de raro.
  it("un talle que tiene un solo plato no entra en la tabla y no la tumba", () => {
    const especial = dish("especial", [
      ["s1", 1000],
      ["s2", 2000],
      ["s3", 3000],
      ["s4", 6000],
    ]);
    const result = buildSizePriceTable([...many(10), especial], sizeOrder);

    expect(result.sizes.map((size) => size.sizeId)).toEqual(["s1", "s2", "s3"]);
    expect(exceptionsOf(result).map((entry) => entry.name)).toEqual(["especial"]);
    expect(result.fellBack).toBe(false);
  });

  it("una categoria de un solo plato arma su tabla con ese plato", () => {
    const result = buildSizePriceTable([uniform("solo")], sizeOrder);

    expect(result.sizes).toHaveLength(3);
    expect(exceptionsOf(result)).toHaveLength(0);
    expect(result.fellBack).toBe(false);
  });

  it("cae cuando ningun talle resuelve", () => {
    const result = buildSizePriceTable(
      [dish("a", [["x", 1000]]), dish("b", [["y", 2000]])],
      sizeOrder,
    );

    expect(result.sizes).toEqual([]);
    expect(result.fellBack).toBe(true);
  });

  it("tolera un sizeOrderMap ausente sin tirar", () => {
    const result = buildSizePriceTable(many(3), undefined);

    expect(result.sizes).toEqual([]);
    expect(result.fellBack).toBe(true);
  });
});

describe("sizeColumnsOf", () => {
  it("devuelve los talles presentes en el orden del ajuste, sin repetir", () => {
    const result = sizeColumnsOf(
      [dish("a", [["s3", 3000]]), dish("b", [["s1", 1000], ["s3", 3200]])],
      sizeOrder,
    );

    expect(result).toEqual([
      { sizeId: "s1", label: "Pequeña" },
      { sizeId: "s3", label: "Grande" },
    ]);
  });

  // Un talle sin resolver no tiene etiqueta con la cual encabezar una columna, y
  // dos talles borrados distintos colisionarian en la misma celda. Su precio se
  // muestra suelto bajo el nombre del plato (ver Task 6), no en una columna.
  it("no arma columna para los talles que no resuelven", () => {
    const result = sizeColumnsOf([dish("a", [["s1", 1000], ["borrado", 4000]])], sizeOrder);

    expect(result).toEqual([{ sizeId: "s1", label: "Pequeña" }]);
  });

  it("devuelve vacio sin platos", () => {
    expect(sizeColumnsOf([], sizeOrder)).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr las pruebas para verificar que fallan**

Run: `npx vitest run src/app/lib/menu/sizePriceTable.test.js`
Expected: FAIL — `Failed to resolve import "@/lib/menu/sizePriceTable"`.

- [ ] **Step 3: Escribir la implementación mínima**

Crear `src/app/lib/menu/sizePriceTable.js`:

```js
// Arma la tabla unica de precios por talle de una categoria: los talles y sus
// precios salen una vez arriba, y los platos van solo con nombre e ingredientes.
//
// El patron viene de los menus de pizzeria de referencia y asume algo que el
// modelo NO garantiza: que todos los platos cuestan lo mismo en cada talle. Cada
// talle es un Product con su precio propio (ver models/tenant/Product.js), asi
// que dos pizzas pueden diferir en "Grande".
//
// La restriccion que manda sobre todo lo demas: ningun plato puede quedar
// mostrado bajo un precio que no es el suyo. Es un menu publico que se lee por
// QR, sin sesion y sin nadie a quien preguntarle; un precio equivocado ahi
// termina en una discusion en la caja. Por eso el plato que se sale de la tabla
// se lista con SUS precios, y por eso una tabla que no representa a la mayoria
// se descarta entera.

// Un talle entra en la tabla solo si al menos la mitad de los platos lo tiene.
// Sin este piso, un talle que existe en un solo plato -una "Jumbo" que solo
// tiene la Especial- entra igual, porque con un solo dato no hay empate que lo
// frene. A partir de ahi los demas platos son excepcion por FALTARLES ese talle,
// las excepciones quedan en mayoria, y la tabla se cae en un menu que no tenia
// nada de raro.
const MIN_SHARE = 0.5;

const asMap = (value) => (value instanceof Map ? value : new Map());
const asArray = (value) => (Array.isArray(value) ? value : []);

// El precio de la tabla para un talle. Devuelve null si hay empate: ni el mas
// bajo ni el primero sirven de desempate, porque las dos reglas elegirian un
// numero que la mitad de los platos no cobra.
function mostFrequentPrice(prices) {
  const counts = new Map();
  for (const price of prices) {
    counts.set(price, (counts.get(price) ?? 0) + 1);
  }

  let best = null;
  let bestCount = 0;
  let tied = false;

  for (const [price, count] of counts) {
    if (count > bestCount) {
      best = price;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }

  return tied ? null : best;
}

// Los talles que resuelven y aparecen en al menos un plato, en el orden del
// ajuste. Es el encabezado de la variante priceColumns: ahi no hay piso de
// mayoria ni precio comun, solo columnas.
export function sizeColumnsOf(dishes, sizeOrderMap) {
  const order = asMap(sizeOrderMap);
  const seen = new Set();

  for (const dish of asArray(dishes)) {
    for (const size of asArray(dish?.sizes)) {
      if (size.sizeId && order.has(size.sizeId)) {
        seen.add(size.sizeId);
      }
    }
  }

  return Array.from(seen)
    .map((sizeId) => ({
      sizeId,
      label: order.get(sizeId).label,
      order: order.get(sizeId).order,
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ sizeId, label }) => ({ sizeId, label }));
}

export function buildSizePriceTable(dishes, sizeOrderMap) {
  const order = asMap(sizeOrderMap);
  const list = asArray(dishes);

  // Solo los talles que resuelven. groupProductsBySize ya dejo en null el
  // sizeId del producto cuyo talle fue borrado o desactivado: sin identidad de
  // talle no se puede agrupar por talle, asi que ese plato no puede calzar en
  // ninguna tabla.
  const pricesBySize = new Map();
  for (const dish of list) {
    for (const size of asArray(dish?.sizes)) {
      if (!size.sizeId || !order.has(size.sizeId)) {
        continue;
      }
      if (!pricesBySize.has(size.sizeId)) {
        pricesBySize.set(size.sizeId, []);
      }
      pricesBySize.get(size.sizeId).push(size.price);
    }
  }

  const minCount = list.length * MIN_SHARE;
  const candidates = [];
  for (const [sizeId, prices] of pricesBySize) {
    if (prices.length < minCount) {
      continue;
    }
    const price = mostFrequentPrice(prices);
    if (price === null) {
      continue;
    }
    candidates.push({
      sizeId,
      label: order.get(sizeId).label,
      price,
      order: order.get(sizeId).order,
    });
  }

  candidates.sort((a, b) => a.order - b.order);
  const sizes = candidates.map(({ sizeId, label, price }) => ({ sizeId, label, price }));

  const tableIds = sizes.map((size) => size.sizeId);
  const priceOf = new Map(sizes.map((size) => [size.sizeId, size.price]));

  // Un plato calza si tiene EXACTAMENTE los talles de la tabla, en el mismo
  // orden -groupProductsBySize y `candidates` ordenan los dos por el orden del
  // ajuste, asi que la comparacion posicional es valida- y todos al precio de
  // la tabla. Cualquier otra cosa es excepcion y lleva sus propios precios.
  let fitting = 0;
  let exceptions = 0;

  const annotated = list.map((dish) => {
    const dishSizes = asArray(dish?.sizes);
    const matches =
      tableIds.length > 0 &&
      dishSizes.length === tableIds.length &&
      dishSizes.every((size, index) => size.sizeId === tableIds[index]) &&
      dishSizes.every((size) => size.price === priceOf.get(size.sizeId));

    if (matches) {
      fitting += 1;
    } else {
      exceptions += 1;
    }

    return { ...dish, isException: !matches };
  });

  // Una tabla cuyas excepciones son mayoria no esta comunicando nada: es un
  // encabezado con doce renglones contradiciendolo. El bloque cae a
  // priceColumns, que siempre muestra el precio exacto de cada plato.
  const fellBack = sizes.length === 0 || exceptions > fitting;

  return { sizes, dishes: annotated, fellBack };
}
```

- [ ] **Step 4: Correr las pruebas para verificar que pasan**

Run: `npx vitest run src/app/lib/menu/sizePriceTable.test.js`
Expected: PASS — 15 pruebas.

- [ ] **Step 5: Commit**

```bash
git add src/app/lib/menu/sizePriceTable.js src/app/lib/menu/sizePriceTable.test.js
git commit -m "feat(menu): agregar la regla de precios no uniformes de la tabla unica"
```

---

### Task 4: El esquema normaliza `variant` y `columns`

**Files:**
- Modify: `src/app/lib/menu/menuSchema.js`
- Test: `src/app/lib/menu/menuSchema.test.js` (existente)

**Interfaces:**
- Consumes: `normalizeVariant` de la Task 1.
- Produces: todo bloque de categoría normalizado tiene `data.variant` (uno del catálogo) y `data.columns` (`1` o `2`). Las Tasks 6, 7 y 10 leen esos campos y pueden confiar en que existen.

- [ ] **Step 1: Escribir las pruebas que fallan**

En `src/app/lib/menu/menuSchema.test.js`, agregar un bloque nuevo:

```js
describe("normalizeMenuDraft: variant y columns", () => {
  const categoryBlock = (data) => ({
    blocks: [{ id: "b1", type: "category", data: { categoryId: "pizzas", ...data } }],
  });

  // Es la garantia de compatibilidad entera de esta rama: un menu publicado
  // antes de 1b-2 no tiene estos campos y tiene que renderizar identico.
  it("un bloque sin variant ni columns recibe los defaults que reproducen el render actual", () => {
    const { blocks } = normalizeMenuDraft(categoryBlock({}));

    expect(blocks[0].data.variant).toBe("sizeRows");
    expect(blocks[0].data.columns).toBe(1);
  });

  it("conserva una variante valida", () => {
    const { blocks } = normalizeMenuDraft(categoryBlock({ variant: "sizeTable" }));

    expect(blocks[0].data.variant).toBe("sizeTable");
  });

  it("cae al default con una variante desconocida", () => {
    const { blocks } = normalizeMenuDraft(categoryBlock({ variant: "tarjetas" }));

    expect(blocks[0].data.variant).toBe("sizeRows");
  });

  it("acepta columns 2", () => {
    const { blocks } = normalizeMenuDraft(categoryBlock({ columns: 2 }));

    expect(blocks[0].data.columns).toBe(2);
  });

  // Este modulo corre sobre el body de una request arbitraria. Solo el numero 2
  // vale: la cadena "2", un 3 o un booleano caen a una columna, que es la
  // presentacion que ya existia y por lo tanto la respuesta segura.
  it("cualquier otro valor de columns cae a 1", () => {
    for (const value of ["2", 3, 0, -1, true, null, undefined, {}]) {
      const { blocks } = normalizeMenuDraft(categoryBlock({ columns: value }));
      expect(blocks[0].data.columns).toBe(1);
    }
  });

  it("los bloques hero y footer no ganan campos de presentacion", () => {
    const { blocks } = normalizeMenuDraft({
      blocks: [
        { id: "h", type: "hero", data: { title: "Hola", variant: "sizeTable", columns: 2 } },
      ],
    });

    expect(blocks[0].data).toEqual({ title: "Hola", subtitle: "" });
  });
});
```

- [ ] **Step 2: Correr las pruebas para verificar que fallan**

Run: `npx vitest run src/app/lib/menu/menuSchema.test.js`
Expected: FAIL — `expected undefined to be 'sizeRows'`.

- [ ] **Step 3: Escribir la implementación mínima**

En `src/app/lib/menu/menuSchema.js`, agregar el import arriba:

```js
import { normalizeVariant } from "@/lib/menu/menuVariants";
```

Y en `normalizeBlock`, reemplazar el `return` de la rama de categoría por:

```js
  return {
    id,
    type,
    visible,
    data: {
      categoryId,
      showPhotos: data.showPhotos !== false,
      showDescriptions: data.showDescriptions !== false,
      variant: normalizeVariant(data.variant),
      // Estricto (=== 2) y no un parseo: el editor manda un numero, y cualquier
      // otra cosa que llegue por el body -"2", 3, true- cae a una columna, que
      // es la presentacion que ya existia y por lo tanto la respuesta segura.
      columns: data.columns === 2 ? 2 : 1,
    },
  };
```

- [ ] **Step 4: Correr las pruebas para verificar que pasan**

Run: `npx vitest run src/app/lib/menu/menuSchema.test.js`
Expected: PASS.

- [ ] **Step 5: Correr la suite completa**

Run: `npm test`
Expected: PASS — 195 pruebas, 13 archivos.

- [ ] **Step 6: Commit**

```bash
git add src/app/lib/menu/menuSchema.js src/app/lib/menu/menuSchema.test.js
git commit -m "feat(menu): normalizar variant y columns en el bloque de categoria"
```

---

### Task 5: Partir `menu-blocks.jsx` sin cambiar comportamiento

`menu-blocks.jsx` tiene 180 líneas; con los tres renderizadores de la Task 6 pasaría de 400 haciendo dos cosas. Esta tarea es una mudanza pura: **cero cambios de comportamiento**.

**Files:**
- Create: `src/app/components/menu/category-blocks.jsx`
- Modify: `src/app/components/menu/menu-blocks.jsx`

**Interfaces:**
- Consumes: nada nuevo.
- Produces: `CategoryBlock` y `SizedCategoryBlock` pasan a exportarse desde `category-blocks.jsx`, con las mismas firmas. `MenuBlockList`, `HeroBlock` y `FooterBlock` se siguen exportando desde `menu-blocks.jsx`, sin cambio. Ningún consumidor cambia sus imports.

- [ ] **Step 1: Crear el archivo nuevo con los dos renderizadores existentes**

Crear `src/app/components/menu/category-blocks.jsx` con el import de `Image` y los cuerpos **verbatim** de `CategoryBlock` y `SizedCategoryBlock` tal como están hoy en `menu-blocks.jsx`, incluidos sus comentarios:

```jsx
import Image from "next/image";

// Los renderizadores del bloque de categoria viven aparte del despacho: son la
// parte que crece con cada variante de presentacion, y el despacho es la parte
// que tiene que seguir siendo legible de una sola mirada.

export function CategoryBlock({ label, products, showPhotos, showDescriptions, formatPrice }) {
  // ...cuerpo verbatim del actual en menu-blocks.jsx, sin un solo cambio...
}

// Categorias con talles: un plato, varias filas de talle+precio debajo, en
// vez de repetir el plato una vez por talle.
export function SizedCategoryBlock({ label, dishes, showPhotos, showDescriptions, formatPrice }) {
  // ...cuerpo verbatim del actual en menu-blocks.jsx, sin un solo cambio...
}
```

- [ ] **Step 2: Quitarlos de `menu-blocks.jsx` e importarlos**

En `src/app/components/menu/menu-blocks.jsx`: borrar las dos funciones y agregar

```jsx
import { CategoryBlock, SizedCategoryBlock } from "@/components/menu/category-blocks";
```

`HeroBlock` y `FooterBlock` no usan imágenes, así que `import Image from "next/image";` queda sin uso en ese archivo: borrarlo. `renderableBlocks` y `groupProductsBySize` se quedan.

- [ ] **Step 3: Verificar que nada cambió**

Run: `npm test`
Expected: PASS — 195 pruebas, 13 archivos.

Run: `npx eslint --no-cache src`
Expected: `✖ 11 problems (4 errors, 7 warnings)` — el número de la base, sin import sin usar nuevo.

Run: `npm run build`
Expected: build exitoso, con `● /m/[slug]` en la tabla de rutas (el `●` confirma que el ISR sigue activo).

- [ ] **Step 4: Commit**

```bash
git add src/app/components/menu/
git commit -m "refactor(menu): separar los renderizadores de categoria del despacho"
```

---

### Task 6: Las tres variantes nuevas y el despacho

**Files:**
- Modify: `src/app/components/menu/category-blocks.jsx`
- Modify: `src/app/components/menu/menu-blocks.jsx`

**Interfaces:**
- Consumes: `buildSizePriceTable` y `sizeColumnsOf` (Task 3), `block.data.variant` (Task 4), `dish.sizes[].sizeId` (Task 2).
- Produces: `PriceColumnsBlock`, `SizeTableBlock`, `SizeBadgesBlock` exportados de `category-blocks.jsx`. `MenuBlockList` despacha por variante. La Task 7 les agrega `columns` a los dos renderizadores viejos.

**Regla de talles sin resolver, común a las tres variantes.** Un talle que no resuelve en el ajuste no tiene etiqueta con la cual encabezar una columna ni con la cual rotular una celda, y dos talles borrados distintos colisionarían en el mismo lugar. Su precio **igual se muestra**, suelto y sin etiqueta, junto al nombre del plato — que es exactamente lo que `SizedCategoryBlock` ya hace hoy con `label: ""`. Perder un precio de un menú público es peor que mostrarlo sin etiqueta.

- [ ] **Step 1: Agregar los tres renderizadores**

En `src/app/components/menu/category-blocks.jsx`, agregar al final:

```jsx
// Los talles que no resuelven en el ajuste no pueden tener columna ni celda
// propia: no hay etiqueta para encabezarla, y dos talles borrados distintos
// colisionarian en el mismo lugar. Su precio se muestra suelto junto al nombre
// del plato. Perder un precio de un menu publico es peor que mostrarlo sin
// etiqueta, y es lo que SizedCategoryBlock ya hacia con label vacio.
const looseSizesOf = (dish) => dish.sizes.filter((size) => !size.sizeId);

function SizePricePair({ size, formatPrice }) {
  return (
    <span className="whitespace-nowrap">
      {size.label ? <span className="text-neutral-500">{size.label} </span> : null}
      <span className="font-semibold text-neutral-900 tabular-nums">{formatPrice(size.price)}</span>
    </span>
  );
}

// Encabezado con los talles y cada plato con sus precios alineados en columnas.
// No admite doble columna: su razon de ser es alinear los precios a lo ancho de
// la seccion, y partida en dos deja cuatro numeros en ~110px de un celular.
export function PriceColumnsBlock({ label, dishes, sizeColumns, showDescriptions, formatPrice }) {
  if (!dishes.length) {
    return null;
  }

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-neutral-200 text-xs uppercase tracking-wide text-neutral-500">
              <th scope="col" className="py-2 text-left font-medium">
                {label}
              </th>
              {sizeColumns.map((size) => (
                <th key={size.sizeId} scope="col" className="py-2 pl-3 text-right font-medium">
                  {size.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dishes.map((dish) => {
              const priceBySize = new Map(
                dish.sizes.filter((size) => size.sizeId).map((size) => [size.sizeId, size.price]),
              );

              return (
                <tr key={dish.id} className="border-b border-neutral-100 align-top">
                  <td className="py-2 pr-3">
                    <p className="font-medium text-neutral-900">{dish.name}</p>
                    {showDescriptions && dish.description ? (
                      <p className="mt-0.5 text-xs text-neutral-500">{dish.description}</p>
                    ) : null}
                    {looseSizesOf(dish).map((size) => (
                      <p key={size.id} className="mt-0.5 text-xs">
                        <SizePricePair size={size} formatPrice={formatPrice} />
                      </p>
                    ))}
                  </td>
                  {sizeColumns.map((size) => (
                    <td
                      key={size.sizeId}
                      className="py-2 pl-3 text-right font-semibold text-neutral-900 tabular-nums"
                    >
                      {priceBySize.has(size.sizeId) ? formatPrice(priceBySize.get(size.sizeId)) : ""}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// Tabla de talles y precios una sola vez arriba; los platos van con nombre e
// ingredientes. El plato que se sale de la tabla lleva sus propios precios en su
// renglon: es la unica forma de ofrecer este patron sin mostrarle a nadie un
// precio que su plato no tiene. La decision de si la tabla sirve o no la toma
// buildSizePriceTable; aca solo se dibuja.
export function SizeTableBlock({ label, table, columns, showDescriptions, formatPrice }) {
  if (!table.dishes.length) {
    return null;
  }

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <div className="mb-5 flex flex-wrap gap-x-6 gap-y-1 rounded-lg bg-neutral-100 px-4 py-3 text-sm">
        {table.sizes.map((size) => (
          <SizePricePair key={size.sizeId} size={size} formatPrice={formatPrice} />
        ))}
      </div>
      <ul className={columns === 2 ? "grid grid-cols-2 gap-x-4 gap-y-3" : "space-y-3"}>
        {table.dishes.map((dish) => (
          <li key={dish.id}>
            <p className="font-medium text-neutral-900">{dish.name}</p>
            {showDescriptions && dish.description ? (
              <p className="mt-0.5 text-sm text-neutral-500">{dish.description}</p>
            ) : null}
            {dish.isException ? (
              <p className="mt-1 flex flex-wrap gap-x-3 text-sm">
                {dish.sizes.map((size) => (
                  <SizePricePair key={size.id} size={size} formatPrice={formatPrice} />
                ))}
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

// Tarjeta con foto y descripcion, mas un badge por talle con su precio. La foto
// va arriba y a todo el ancho de la tarjeta, no al costado: es lo que distingue
// esta variante de sizeRows.
export function SizeBadgesBlock({
  label,
  dishes,
  columns,
  showPhotos,
  showDescriptions,
  formatPrice,
}) {
  if (!dishes.length) {
    return null;
  }

  const twoUp = columns === 2;

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <ul className={twoUp ? "grid grid-cols-2 gap-3" : "space-y-4"}>
        {dishes.map((dish) => (
          <li key={dish.id} className="rounded-xl border border-neutral-200 p-3">
            {showPhotos && dish.image?.url ? (
              <div
                className={`relative mb-2 w-full overflow-hidden rounded-lg bg-neutral-100 ${
                  twoUp ? "h-24" : "h-36"
                }`}
              >
                <Image
                  src={dish.image.url}
                  alt={dish.name}
                  fill
                  sizes={twoUp ? "45vw" : "(max-width: 640px) 90vw, 600px"}
                  className="object-cover"
                />
              </div>
            ) : null}
            <p className="font-medium text-neutral-900">{dish.name}</p>
            {showDescriptions && dish.description ? (
              <p className="mt-0.5 text-sm text-neutral-500">{dish.description}</p>
            ) : null}
            <p className="mt-2 flex flex-wrap gap-1.5">
              {dish.sizes.map((size) => (
                <span key={size.id} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs">
                  <SizePricePair size={size} formatPrice={formatPrice} />
                </span>
              ))}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

- [ ] **Step 2: Despachar por variante en `MenuBlockList`**

En `src/app/components/menu/menu-blocks.jsx`, ampliar los imports:

```jsx
import {
  CategoryBlock,
  PriceColumnsBlock,
  SizeBadgesBlock,
  SizedCategoryBlock,
  SizeTableBlock,
} from "@/components/menu/category-blocks";
import { buildSizePriceTable, sizeColumnsOf } from "@/lib/menu/sizePriceTable";
```

Y reemplazar la rama `if (category?.hasSizes)` por:

```jsx
    // El agrupado por talle lo sigue decidiendo el flag `hasSizes` de la
    // categoria -el mismo que usa el resto del POS-, no la variante: una
    // categoria sin talles no tiene nada que las cuatro variantes distingan, asi
    // que se renderiza plana aunque tenga una variante guardada. Y la variante
    // se guarda igual, porque hasSizes se puede encender en Ajustes despues de
    // publicar y en ese momento la eleccion del dueno tiene que valer.
    if (category?.hasSizes) {
      const dishes = groupProductsBySize(categoryProducts, sizeOrderMap);
      const variant = block.data.variant;

      if (variant === "priceColumns") {
        return (
          <PriceColumnsBlock
            key={block.id}
            label={category.label ?? ""}
            dishes={dishes}
            sizeColumns={sizeColumnsOf(dishes, sizeOrderMap)}
            showDescriptions={block.data.showDescriptions}
            formatPrice={formatPrice}
          />
        );
      }

      if (variant === "sizeTable") {
        const table = buildSizePriceTable(dishes, sizeOrderMap);

        // La caida no es una excepcion que se maneje aparte: es la misma
        // decision que el editor le muestra al dueno, tomada por el mismo
        // modulo. Si aca se reimplementara la condicion, la previa y el aviso
        // podrian decir una cosa y el menu publico mostrar otra.
        if (table.fellBack) {
          return (
            <PriceColumnsBlock
              key={block.id}
              label={category.label ?? ""}
              dishes={dishes}
              sizeColumns={sizeColumnsOf(dishes, sizeOrderMap)}
              showDescriptions={block.data.showDescriptions}
              formatPrice={formatPrice}
            />
          );
        }

        return (
          <SizeTableBlock
            key={block.id}
            label={category.label ?? ""}
            table={table}
            columns={block.data.columns}
            showDescriptions={block.data.showDescriptions}
            formatPrice={formatPrice}
          />
        );
      }

      if (variant === "sizeBadges") {
        return (
          <SizeBadgesBlock
            key={block.id}
            label={category.label ?? ""}
            dishes={dishes}
            columns={block.data.columns}
            showPhotos={block.data.showPhotos}
            showDescriptions={block.data.showDescriptions}
            formatPrice={formatPrice}
          />
        );
      }

      return (
        <SizedCategoryBlock
          key={block.id}
          label={category.label ?? ""}
          dishes={dishes}
          showPhotos={block.data.showPhotos}
          showDescriptions={block.data.showDescriptions}
          formatPrice={formatPrice}
        />
      );
    }
```

- [ ] **Step 3: Verificar**

Run: `npm test`
Expected: PASS — 195 pruebas, 13 archivos. Los componentes no tienen pruebas; lo que se verifica es que nada de lo anterior se rompió.

Run: `npx eslint --no-cache src`
Expected: `✖ 11 problems (4 errors, 7 warnings)`.

Run: `npm run build`
Expected: build exitoso con `● /m/[slug]`.

- [ ] **Step 4: Commit**

```bash
git add src/app/components/menu/
git commit -m "feat(menu): agregar columnas de precio, tabla unica y badges por talle"
```

---

### Task 7: Doble columna en los dos renderizadores existentes

**Files:**
- Modify: `src/app/components/menu/category-blocks.jsx`
- Modify: `src/app/components/menu/menu-blocks.jsx`

**Interfaces:**
- Consumes: `block.data.columns` (Task 4).
- Produces: `CategoryBlock` y `SizedCategoryBlock` aceptan `columns`. Con `columns` ausente o `1` renderizan exactamente como antes de esta rama.

- [ ] **Step 1: Agregar `columns` a `CategoryBlock`**

En `src/app/components/menu/category-blocks.jsx`, reemplazar `CategoryBlock` entera:

```jsx
export function CategoryBlock({
  label,
  products,
  showPhotos,
  showDescriptions,
  columns,
  formatPrice,
}) {
  if (!products.length) {
    return null;
  }

  // Los menus de referencia que usan doble columna son papel angosto y alto, la
  // misma proporcion que un celular, asi que no hay breakpoint: dos columnas es
  // dos columnas desde 390px. Con foto encendida la foto baja de 80 a 56px, que
  // es lo que deja lugar al nombre en la mitad de un celular.
  const twoUp = columns === 2;

  return (
    <section className="px-5 py-8">
      <h2 className="mb-4 text-lg font-semibold uppercase tracking-wide text-neutral-900">
        {label}
      </h2>
      <ul className={twoUp ? "grid grid-cols-2 gap-x-4 gap-y-4" : "space-y-4"}>
        {products.map((product) => (
          <li key={product.id} className="flex gap-4">
            {showPhotos && product.image?.url ? (
              <div
                className={`relative shrink-0 overflow-hidden rounded-lg bg-neutral-100 ${
                  twoUp ? "size-14" : "size-20"
                }`}
              >
                <Image
                  src={product.image.url}
                  alt={product.name}
                  fill
                  sizes={twoUp ? "56px" : "80px"}
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
```

- [ ] **Step 2: Agregar `columns` a `SizedCategoryBlock`**

Mismo tratamiento, sin tocar nada más:

- agregar `columns` a la firma, entre `showDescriptions` y `formatPrice`;
- agregar `const twoUp = columns === 2;` después del early return;
- el `<ul>` exterior pasa de `className="space-y-5"` a `className={twoUp ? "grid grid-cols-2 gap-x-4 gap-y-5" : "space-y-5"}`;
- el contenedor de la foto pasa de `"relative size-20 shrink-0 overflow-hidden rounded-lg bg-neutral-100"` a `` {`relative shrink-0 overflow-hidden rounded-lg bg-neutral-100 ${twoUp ? "size-14" : "size-20"}`} ``;
- el `<Image>` pasa de `sizes="80px"` a `sizes={twoUp ? "56px" : "80px"}`.

El `<ul>` interior de talles no cambia.

- [ ] **Step 3: Pasar `columns` desde el despacho**

En `src/app/components/menu/menu-blocks.jsx`, agregar `columns={block.data.columns}` al `<SizedCategoryBlock>` y al `<CategoryBlock>` finales.

- [ ] **Step 4: Verificar**

Run: `npm test`
Expected: PASS — 195 pruebas.

Run: `npx eslint --no-cache src`
Expected: `✖ 11 problems (4 errors, 7 warnings)`.

Run: `npm run build`
Expected: build exitoso con `● /m/[slug]`.

- [ ] **Step 5: Commit**

```bash
git add src/app/components/menu/
git commit -m "feat(menu): permitir doble columna en la lista plana y en filas por talle"
```

---

### Task 8: `/menu/categories` devuelve `hasSizes`

**Files:**
- Modify: `src/app/api/company/sedes/[tenantId]/menu/categories/route.js`

**Interfaces:**
- Consumes: nada.
- Produces: cada fila de `categories` pasa a ser `{ id, label, hasSizes }`. La Task 10 lo usa para decidir si dibuja el select.

Sin prueba automatizada: no hay pruebas de rutas API en el repo y este plan no monta esa infraestructura. Se cubre en el punto 13 de la verificación manual del spec.

- [ ] **Step 1: Agregar el campo**

En el `.map` de la respuesta, reemplazar:

```js
        .map((category) => ({
          id: String(category.id),
          label: category.label ?? String(category.id),
          // Estricto (=== true) igual que en preview-data, que devuelve este
          // mismo flag: las dos lecturas alimentan la misma decision -que
          // variantes se ofrecen y como se renderiza- y si difirieran, el editor
          // ofreceria un selector para una categoria que el renderizador
          // despacha plana.
          hasSizes: category.hasSizes === true,
        })),
```

- [ ] **Step 2: Verificar**

Run: `npx eslint --no-cache src`
Expected: `✖ 11 problems (4 errors, 7 warnings)`.

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 3: Commit**

```bash
git add "src/app/api/company/sedes/[tenantId]/menu/categories/route.js"
git commit -m "feat(menu): exponer hasSizes en el endpoint de categorias del editor"
```

---

### Task 9: La carga de datos de la previa sube al editor

Hoy el iframe pide sus propios datos, lo que deja al editor sin los precios y por lo tanto sin poder avisar de la caída de la tabla sin reimplementar la regla en el servidor.

**Files:**
- Create: `src/app/lib/menu/previewMaps.js`
- Test: `src/app/lib/menu/previewMaps.test.js`
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview-panel.jsx`
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview/page.jsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces: `buildPreviewMaps(data)` → `{ categoryMap, productsByCategory, sizeOrderMap }`, usado por la previa para renderizar y por la Task 10 para calcular el aviso. `PreviewPanel` acepta las props `data` y `failed`. El mensaje `menu-preview-blocks` pasa a llevar `{ type, blocks, data }`.

- [ ] **Step 1: Escribir la prueba del módulo de mapas**

Crear `src/app/lib/menu/previewMaps.test.js`:

```js
import { describe, expect, it } from "vitest";
import { buildPreviewMaps } from "@/lib/menu/previewMaps";

const data = {
  categories: [
    { id: "pizzas", label: "Pizzas", hasSizes: true },
    { id: "bebidas", label: "Bebidas", hasSizes: false },
  ],
  products: [
    { id: "p1", categoryId: "pizzas", name: "Margarita", price: 1000, description: "", image: null, sizeId: "s1" },
    { id: "p2", categoryId: "bebidas", name: "Agua", price: 500, description: "", image: null, sizeId: null },
  ],
  sizes: [{ id: "s1", label: "Pequeña", order: 0 }],
  currency: "CRC",
  truncated: false,
};

describe("buildPreviewMaps", () => {
  // La previa solo recibe categorias activas (el endpoint ya filtra con
  // === true), asi que marcarlas activas aca no relaja nada: es lo que
  // renderableBlocks necesita para no descartarlas todas.
  it("arma el categoryMap con las categorias marcadas activas", () => {
    const { categoryMap } = buildPreviewMaps(data);

    expect(categoryMap.get("pizzas")).toEqual({
      id: "pizzas",
      label: "Pizzas",
      hasSizes: true,
      active: true,
    });
  });

  it("agrupa los productos por categoria", () => {
    const { productsByCategory } = buildPreviewMaps(data);

    expect(productsByCategory.get("pizzas").map((row) => row.id)).toEqual(["p1"]);
    expect(productsByCategory.get("bebidas").map((row) => row.id)).toEqual(["p2"]);
  });

  it("arma el sizeOrderMap con la misma forma que getProductSizeOrderMap", () => {
    const { sizeOrderMap } = buildPreviewMaps(data);

    expect(sizeOrderMap.get("s1")).toEqual({ label: "Pequeña", order: 0 });
  });

  // El editor llama a esto antes de que llegue la respuesta, y la previa antes
  // de recibir el primer mensaje. Tirar ahi dejaria las dos pantallas en blanco.
  it("devuelve mapas vacios sin datos", () => {
    for (const value of [null, undefined, {}]) {
      const maps = buildPreviewMaps(value);
      expect(maps.categoryMap.size).toBe(0);
      expect(maps.productsByCategory.size).toBe(0);
      expect(maps.sizeOrderMap.size).toBe(0);
    }
  });
});
```

- [ ] **Step 2: Correr la prueba para verificar que falla**

Run: `npx vitest run src/app/lib/menu/previewMaps.test.js`
Expected: FAIL — `Failed to resolve import "@/lib/menu/previewMaps"`.

- [ ] **Step 3: Escribir el módulo**

Crear `src/app/lib/menu/previewMaps.js`:

```js
// JSON no transporta Map, asi que preview-data manda todo como arreglos y el
// cliente arma los Map que MenuBlockList espera. Esto vive en un modulo propio
// porque ahora lo necesitan dos: la previa, para renderizar, y el editor, para
// calcular el aviso de la tabla que cae. Duplicarlo dejaria al aviso mirando
// datos armados distinto de los que se renderizan.
const asArray = (value) => (Array.isArray(value) ? value : []);

export function buildPreviewMaps(data) {
  const source = data || {};

  // `active: true` no relaja el criterio estricto de renderableBlocks: el
  // endpoint ya devuelve solo categorias con active === true, y este campo es
  // lo que le permite al filtro reconocerlas. Sin el, la previa descartaria
  // todos los bloques de categoria.
  const categoryMap = new Map(
    asArray(source.categories).map((category) => [category.id, { ...category, active: true }]),
  );

  const productsByCategory = new Map();
  for (const product of asArray(source.products)) {
    if (!productsByCategory.has(product.categoryId)) {
      productsByCategory.set(product.categoryId, []);
    }
    productsByCategory.get(product.categoryId).push(product);
  }

  const sizeOrderMap = new Map(
    asArray(source.sizes).map((size) => [size.id, { label: size.label, order: size.order }]),
  );

  return { categoryMap, productsByCategory, sizeOrderMap };
}
```

- [ ] **Step 4: Correr la prueba para verificar que pasa**

Run: `npx vitest run src/app/lib/menu/previewMaps.test.js`
Expected: PASS — 4 pruebas.

- [ ] **Step 5: Traer el fetch al editor**

En `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`:

Agregar el parser puro junto a los otros `read*`, **fuera** del componente (restricción del compilador de React):

```js
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
```

Agregar el estado, junto a `categoriesFailed`:

```js
  const [previewData, setPreviewData] = useState(null);
  // Un fallo de preview-data no aborta la carga, por el mismo motivo que el de
  // /menu/categories: el menu ya vino y el dueno puede seguir acomodando
  // bloques. Lo que no puede es quedarse sin explicacion de por que la previa
  // esta vacia, y para eso existe este flag.
  const [previewFailed, setPreviewFailed] = useState(false);
```

En `loadMenu`, agregar el tercer fetch al `Promise.all`:

```js
        const [menuRes, categoriesRes, previewRes] = await Promise.all([
          fetch(`/api/company/sedes/${tenantId}/menu`),
          fetch(`/api/company/sedes/${tenantId}/menu/categories`),
          fetch(`/api/company/sedes/${tenantId}/menu/preview-data`),
        ]);
```

Y junto a la lectura de `categoriesRes` (misma forma: el `.ok` se guarda antes de leer el cuerpo):

```js
        const previewOk = previewRes.ok;
        const previewBody = await previewRes.json().catch(() => ({}));
```

Y junto a los otros `setState` del camino de éxito:

```js
        setPreviewData(previewOk ? readPreviewData(previewBody) : null);
        setPreviewFailed(previewOk === false);
```

El `catch` de `loadMenu` no se toca: ya marca `loadFailed`.

Pasar los datos al panel:

```jsx
                <PreviewPanel
                  previewUrl={`/${locale}/admin/${companyId}/menu/${tenantId}/preview`}
                  blocks={blocks}
                  data={previewData}
                  failed={previewFailed}
                />
```

- [ ] **Step 6: Mandar los datos por el canal que ya existe**

En `preview-panel.jsx`, cambiar la firma, agregar la ref de datos e incluirla en la carga útil:

```jsx
export function PreviewPanel({ previewUrl, blocks, data, failed }) {
  const t = useTranslations("OnlineMenu");
  const frameRef = useRef(null);
  const blocksRef = useRef(blocks);
  const dataRef = useRef(data);
  const [phone, setPhone] = useState(false);

  const send = useCallback(() => {
    const frame = frameRef.current;
    if (!frame || !frame.contentWindow) {
      return;
    }
    // Nunca '*': el destino es siempre este mismo origen.
    frame.contentWindow.postMessage(
      { type: BLOCKS_MESSAGE, blocks: blocksRef.current, data: dataRef.current },
      window.location.origin,
    );
  }, []);
```

El efecto que sincroniza pasa a cubrir las dos refs. El motivo de siempre: el listener de READY y el handler de `onLoad` se registran una sola vez y necesitan leer lo más reciente sin volver a suscribirse, y la asignación va dentro del efecto y no en el cuerpo del componente porque escribir una ref durante el render es lo que el compilador marca.

```jsx
  useEffect(() => {
    blocksRef.current = blocks;
    dataRef.current = data;
    send();
  }, [blocks, data, send]);
```

Y justo encima del `<div>` que envuelve al `<iframe>`, el aviso de fallo:

```jsx
      {failed ? (
        <p
          role="status"
          className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-700 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-400"
        >
          {t("previewLoadFailed")}
        </p>
      ) : null}
```

- [ ] **Step 7: Vaciar la previa de su propia carga**

Reemplazar `preview/page.jsx` entera:

```jsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { MenuBlockList } from "@/components/menu/menu-blocks";
import { createMenuPriceFormatter } from "@/lib/menu/menuFormat";
import { renderableBlocks } from "@/lib/menu/menuSchema";
import { buildPreviewMaps } from "@/lib/menu/previewMaps";

const READY_MESSAGE = "menu-preview-ready";
const BLOCKS_MESSAGE = "menu-preview-blocks";

// Esta pagina ya no carga nada: el editor hace el fetch y le manda todo por el
// mismo canal que le manda los bloques. Es lo que le permite al editor calcular
// el aviso de la tabla que cae con el mismo modulo que renderiza aca, en vez de
// con una segunda implementacion de la regla en el servidor. El precio es que la
// primera pintura espera al fetch del padre.
export default function MenuPreviewPage() {
  const t = useTranslations("OnlineMenu");
  const [payload, setPayload] = useState(null);

  // El aviso de "listo" es lo que evita la carrera al montar: el padre puede
  // mandar antes de que este listener exista, y ese primer dibujo saldria vacio
  // sin motivo aparente.
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
      setPayload({
        blocks: Array.isArray(message.blocks) ? message.blocks : [],
        data: message.data || null,
      });
    }

    window.addEventListener("message", handleMessage);
    window.parent.postMessage({ type: READY_MESSAGE }, origin);

    return () => window.removeEventListener("message", handleMessage);
  }, []);

  const blocks = payload ? payload.blocks : [];
  const data = payload ? payload.data : null;

  const maps = useMemo(() => buildPreviewMaps(data), [data]);
  const formatPrice = useMemo(
    () => createMenuPriceFormatter(data ? data.currency : null),
    [data],
  );

  // El estado vacio se decide DESPUES de filtrar, con el mismo renderableBlocks
  // que aplica MenuBlockList adentro. Decidirlo sobre `blocks` hacia que con
  // todos los bloques ocultos hubiera blocks.length > 0 y por lo tanto ni aviso
  // ni contenido: una pagina en blanco, justo en el caso en que el dueno mas
  // necesita entender que oculto todo.
  const visibleBlocks = useMemo(
    () => renderableBlocks(blocks, maps.categoryMap),
    [blocks, maps],
  );

  // Y solo cuenta como vacio si los datos ya llegaron: con `data` en null el
  // categoryMap esta vacio, todo bloque de categoria se filtra, y un menu que
  // solo tiene categorias se leeria como "sin bloques" durante la carga.
  const isEmpty = data !== null && visibleBlocks.length === 0;

  return (
    <main className="mx-auto min-h-screen max-w-2xl bg-white text-neutral-900">
      {data?.truncated ? (
        <p className="bg-amber-100 px-5 py-2 text-center text-xs text-amber-900">
          {t("previewTruncated")}
        </p>
      ) : null}
      {isEmpty ? (
        <p className="px-5 py-16 text-center text-sm text-neutral-400">{t("previewEmpty")}</p>
      ) : (
        <MenuBlockList
          blocks={blocks}
          categoryMap={maps.categoryMap}
          productsByCategory={maps.productsByCategory}
          sizeOrderMap={maps.sizeOrderMap}
          formatPrice={formatPrice}
        />
      )}
    </main>
  );
}
```

- [ ] **Step 8: Cambiar las claves de traducción**

En `messages/es.json`, dentro de `OnlineMenu`: borrar `"previewError"` (queda huérfana — la previa ya no tiene estado de error propio) y agregar:

```json
    "previewLoadFailed": "No se pudieron cargar los productos de la sede, así que la vista previa está vacía. Reintentá para volver a cargarla; el menú que estás armando no se perdió.",
```

En `messages/en.json`: borrar `"previewError"` y agregar:

```json
    "previewLoadFailed": "The location's products could not be loaded, so the preview is empty. Retry to load it again; the menu you are building was not lost.",
```

- [ ] **Step 9: Verificar**

Run: `npm test`
Expected: PASS — 199 pruebas, 14 archivos.

Run: `npx eslint --no-cache src`
Expected: `✖ 11 problems (4 errors, 7 warnings)` — sin imports sin usar nuevos en `preview/page.jsx`.

Run: `grep -rn "previewError" src messages`
Expected: sin resultados.

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 10: Commit**

```bash
git add src/app/lib/menu/previewMaps.js src/app/lib/menu/previewMaps.test.js "src/app/[locale]/admin/[companyId]/menu/[tenantId]/" messages/
git commit -m "refactor(menu): mover la carga de datos de la previa al editor"
```

---

### Task 10: Los controles del editor y el aviso

**Files:**
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/block-row.jsx`
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/block-canvas.jsx`
- Modify: `src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx`
- Modify: `messages/es.json`, `messages/en.json`

**Interfaces:**
- Consumes: `normalizeVariant`, `supportsColumns`, `variantsForCategory` (Task 1); `groupProductsBySize` (Task 2); `buildSizePriceTable` (Task 3); `hasSizes` de `/menu/categories` (Task 8); `buildPreviewMaps` y el estado `previewData` (Task 9).
- Produces: nada que consuman tareas posteriores.

- [ ] **Step 1: Agregar las claves de traducción**

En `messages/es.json`, dentro de `OnlineMenu`:

```json
    "variantLabel": "Presentación",
    "variant_sizeRows": "Filas por tamaño",
    "variant_priceColumns": "Columnas de precio",
    "variant_sizeTable": "Tabla de precios única",
    "variant_sizeBadges": "Etiquetas por plato",
    "twoColumns": "Dos columnas",
    "sizeTableFallbackWarning": "Los precios de esta categoría no son uniformes: hay más platos que se salen de la tabla que platos que la siguen. El bloque se muestra por columnas de precio para que ningún cliente vea un precio que no es el suyo.",
```

En `messages/en.json`:

```json
    "variantLabel": "Layout",
    "variant_sizeRows": "Rows per size",
    "variant_priceColumns": "Price columns",
    "variant_sizeTable": "Single price table",
    "variant_sizeBadges": "Tags per dish",
    "twoColumns": "Two columns",
    "sizeTableFallbackWarning": "Prices in this category are not uniform: more dishes fall outside the table than follow it. The block is shown as price columns so no customer sees a price that is not theirs.",
```

- [ ] **Step 2: Agregar los controles a `CategoryFields`**

En `block-row.jsx`, agregar el import:

```jsx
import { normalizeVariant, supportsColumns, variantsForCategory } from "@/lib/menu/menuVariants";
```

Y reemplazar `CategoryFields` entera:

```jsx
function CategoryFields({ data, hasSizes, onPatch }) {
  const t = useTranslations("OnlineMenu");
  const variant = normalizeVariant(data.variant);
  const variants = variantsForCategory(hasSizes);

  return (
    <div className="space-y-3">
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
        {/*
          El control se esconde en priceColumns en vez de ofrecerse e ignorarse
          despues: esa variante alinea los precios a lo ancho de la seccion y
          partida en dos se vuelve ilegible. El valor guardado no se toca, asi
          que volver a otra variante lo devuelve como estaba.
        */}
        {supportsColumns(variant) ? (
          <label className="flex items-center gap-2 text-xs text-slate-500">
            <input
              type="checkbox"
              checked={data.columns === 2}
              onChange={(event) => onPatch({ columns: event.target.checked ? 2 : 1 })}
            />
            {t("twoColumns")}
          </label>
        ) : null}
      </div>

      {/*
        Sin talles no hay nada que elegir: las cuatro variantes se distinguen
        justamente por como muestran los talles, y el renderizador despacha esa
        categoria plana sin mirar la variante.
      */}
      {variants.length > 0 ? (
        <label className="block text-xs text-slate-500">
          {t("variantLabel")}
          <select
            value={variant}
            onChange={(event) => onPatch({ variant: event.target.value })}
            className={`${inputClass} mt-1`}
          >
            {variants.map((id) => (
              <option key={id} value={id}>
                {t(`variant_${id}`)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </div>
  );
}
```

Y en `BlockRow`, aceptar y bajar el flag:

```jsx
export function BlockRow({ block, title, warning, hasSizes, expanded, onToggleExpand, onPatch, onToggleVisible, onRemove }) {
```

```jsx
          {block.type === "category" ? (
            <CategoryFields data={block.data} hasSizes={hasSizes} onPatch={onPatch} />
          ) : null}
```

- [ ] **Step 3: Bajar los dos datos por el lienzo**

En `block-canvas.jsx`, ampliar la firma:

```jsx
export function BlockCanvas({
  blocks,
  categoryLabels,
  categoriesFailed,
  sizedCategoryIds,
  fallbackBlockIds,
  availableCategoryRows,
  canAddHero,
  canAddFooter,
  onChange,
}) {
```

Reemplazar `warningFor` (mantiene el comentario largo que ya tiene arriba, que sigue valiendo):

```jsx
  const warningFor = (block) => {
    if (categoriesFailed) {
      return null;
    }
    if (block.type !== "category") {
      return null;
    }
    if (!categoryLabels.has(block.data.categoryId)) {
      return t("categoryInactiveWarning");
    }
    // El aviso de categoria inactiva gana: un bloque que no va a aparecer en el
    // menu publico no necesita que ademas le expliquen como se veria.
    if (fallbackBlockIds.has(block.id)) {
      return t("sizeTableFallbackWarning");
    }
    return null;
  };
```

Y agregar la prop al `<BlockRow>`:

```jsx
                  hasSizes={sizedCategoryIds.has(block.data.categoryId)}
```

- [ ] **Step 4: Calcular los dos conjuntos en el editor**

En `page.jsx`, agregar los imports:

```jsx
import { groupProductsBySize } from "@/lib/menu/groupProductsBySize";
import { buildPreviewMaps } from "@/lib/menu/previewMaps";
import { buildSizePriceTable } from "@/lib/menu/sizePriceTable";
```

Y junto a los otros `useMemo`:

```jsx
  const sizedCategoryIds = useMemo(
    () => new Set(categoryRows.filter((row) => row.hasSizes).map((row) => row.id)),
    [categoryRows],
  );

  // El aviso lo decide el MISMO modulo que renderiza la previa y el menu
  // publico. Reimplementar la condicion aca -aunque diera lo mismo hoy- es
  // exactamente la divergencia que este modulo ya pago dos veces: el editor
  // diria una cosa y el visitante veria otra, sin error en ninguna capa.
  const fallbackBlockIds = useMemo(() => {
    const ids = new Set();
    if (!previewData) {
      return ids;
    }

    const maps = buildPreviewMaps(previewData);

    for (const block of blocks) {
      if (block.type !== "category" || block.data.variant !== "sizeTable") {
        continue;
      }
      if (!sizedCategoryIds.has(block.data.categoryId)) {
        continue;
      }
      const products = maps.productsByCategory.get(block.data.categoryId) ?? [];
      const dishes = groupProductsBySize(products, maps.sizeOrderMap);
      if (buildSizePriceTable(dishes, maps.sizeOrderMap).fellBack) {
        ids.add(block.id);
      }
    }

    return ids;
  }, [previewData, blocks, sizedCategoryIds]);
```

Y pasarlos al lienzo:

```jsx
                <BlockCanvas
                  blocks={blocks}
                  categoryLabels={categoryLabels}
                  categoriesFailed={categoriesFailed}
                  sizedCategoryIds={sizedCategoryIds}
                  fallbackBlockIds={fallbackBlockIds}
                  availableCategoryRows={availableCategoryRows}
                  canAddHero={canAddType(blocks, "hero")}
                  canAddFooter={canAddType(blocks, "footer")}
                  onChange={setBlocks}
                />
```

- [ ] **Step 5: Verificar**

Run: `npm test`
Expected: PASS — 199 pruebas, 14 archivos.

Run: `npx eslint --no-cache src`
Expected: `✖ 11 problems (4 errors, 7 warnings)`.

Run: `npm run build`
Expected: build exitoso.

- [ ] **Step 6: Commit**

```bash
git add "src/app/[locale]/admin/[companyId]/menu/[tenantId]/" messages/
git commit -m "feat(menu): elegir presentacion y doble columna por bloque en el editor"
```

---

### Task 11: Verificación de toda la rama

**Files:** ninguno. Es una tarea de verificación; si algo falla, se arregla y se vuelve a correr.

- [ ] **Step 1: Suite completa**

Run: `npm test`
Expected: PASS — 199 pruebas, 14 archivos (base: 162 en 10).

- [ ] **Step 2: Lint en la línea de base**

Run: `npx eslint --no-cache src`
Expected: exactamente `✖ 11 problems (4 errors, 7 warnings)`. Cualquier problema nuevo es de esta rama y se arregla.

- [ ] **Step 3: Build con el ISR intacto**

Run: `npm run build`
Expected: build exitoso, y `● /m/[slug]` presente en la tabla de rutas. Si el `●` desapareció, el ISR del menú público se apagó, y eso bloquea el merge.

- [ ] **Step 4: Verificar que el compilador de React no descartó ningún componente**

En este proyecto un componente que sale de la compilación se pierde en silencio, sin error en el build.

```bash
node -e "
const babel = require('@babel/core');
const fs = require('fs');
const files = [
  'src/app/components/menu/menu-blocks.jsx',
  'src/app/components/menu/category-blocks.jsx',
  'src/app/[locale]/admin/[companyId]/menu/[tenantId]/page.jsx',
  'src/app/[locale]/admin/[companyId]/menu/[tenantId]/block-row.jsx',
  'src/app/[locale]/admin/[companyId]/menu/[tenantId]/block-canvas.jsx',
  'src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview-panel.jsx',
  'src/app/[locale]/admin/[companyId]/menu/[tenantId]/preview/page.jsx',
];
let compiled = 0, bailouts = 0;
for (const file of files) {
  babel.transformSync(fs.readFileSync(file, 'utf8'), {
    filename: file,
    presets: [['@babel/preset-react', { runtime: 'automatic' }]],
    plugins: [['babel-plugin-react-compiler', { logger: { logEvent(_f, event) {
      if (event.kind === 'CompileSuccess') compiled++;
      if (event.kind === 'CompileError' || event.kind === 'CompileSkip') { bailouts++; console.log('BAILOUT', file, event.kind, event.detail && event.detail.reason); }
    } }}]],
  });
}
console.log('compiladas:', compiled, 'bailouts:', bailouts);
"
```

Expected: `bailouts: 0`, con `compiladas` mayor que cero.

**Control negativo, obligatorio.** Un detector que no detecta nada da el mismo resultado que "todo bien". Antes de creerle al `0`, meter temporalmente un `try { const x = a ?? b; } catch {}` dentro de un componente de uno de esos archivos, volver a correr el comando y confirmar que el bailout aparece. Deshacer el cambio y volver a correr para confirmar que vuelve a `0`.

- [ ] **Step 5: Confirmar que la página pública no se tocó**

Run: `git diff origin/main --stat -- src/app/m/`
Expected: vacío. Lo único que cambia bajo los pies de esa página son los componentes compartidos, y eso lo comprueba el punto 1 de la verificación manual.

- [ ] **Step 6: Correr la verificación manual**

Los 13 puntos están en la sección "Verificación manual" del spec. Todos requieren sesión de dueño y ninguno se puede automatizar. El punto 1 —abrir un menú publicado antes de esta rama y comprobar que renderiza idéntico— es el que decide si la rama se puede mergear.

---

## Notas para quien ejecute

- **No tocar `main`. No hacer push.** El cierre de rama lo decide el dueño del proyecto.
- **No intentar iniciar sesión en la app, no inventar credenciales, no levantar un servidor de desarrollo, y no leer `.env`** (está en `.gitignore`). Todo lo de este plan se verifica con `npm test`, `eslint` y `npm run build`.
- **Cada `toEqual` es exacto.** La Task 2 agrega un campo a una estructura ya probada: hay que actualizar las expectativas existentes, no solo agregar pruebas nuevas.
- **Los conteos de pruebas son la expectativa, no una meta.** Si tu número difiere, averiguá por qué antes de seguir: probablemente falte una prueba o sobre un archivo.
- **Las tres variantes nuevas no tienen pruebas automatizadas** porque no hay entorno de DOM en el repo. Lo que sí está probado es la regla que las alimenta (`sizePriceTable`), que es donde vive el riesgo real: un precio mal mostrado.

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

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
      { id: "b", sizeId: "s1", label: "Pequeña", price: 1000 },
      { id: "a", sizeId: "s2", label: "Mediana", price: 2000 },
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
      { id: "b", sizeId: "s1", label: "Pequeña", price: 1000 },
      { id: "a", sizeId: null, label: "", price: 1000 },
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
});

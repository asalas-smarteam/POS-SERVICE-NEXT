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

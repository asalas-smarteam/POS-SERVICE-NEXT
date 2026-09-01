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

  it("crea la categoria con fotos, descripciones y variante por defecto prendidas", () => {
    const result = addBlock([], "category", { categoryId: "c9" });
    expect(result[0]).toEqual({
      id: "category-c9",
      type: "category",
      visible: true,
      data: {
        categoryId: "c9",
        showPhotos: true,
        showDescriptions: true,
        variant: "sizeRows",
        columns: 1,
      },
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

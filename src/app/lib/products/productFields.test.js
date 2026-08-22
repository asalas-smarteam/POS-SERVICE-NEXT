import { describe, expect, it } from "vitest";
import { pickProductFields } from "@/lib/products/productFields";

describe("pickProductFields", () => {
  it("conserva los campos escribibles", () => {
    const result = pickProductFields({
      name: "Pizza",
      price: 5000,
      categoryId: "plato_fuerte",
      description: "Con albahaca",
      type: "SIMPLE",
      allowsHalf: true,
      allowsExtras: false,
      requiresKitchen: "YES",
      productSizeId: "large",
      ingredients: [],
    });

    expect(result).toEqual({
      name: "Pizza",
      price: 5000,
      categoryId: "plato_fuerte",
      description: "Con albahaca",
      type: "SIMPLE",
      allowsHalf: true,
      allowsExtras: false,
      requiresKitchen: "YES",
      productSizeId: "large",
      ingredients: [],
    });
  });

  it("descarta image, que solo escriben los endpoints de imagen", () => {
    const result = pickProductFields({
      name: "Pizza",
      image: { url: "https://atacante.example/x.jpg", pathname: "x" },
    });

    expect(result).toEqual({ name: "Pizza" });
  });

  it("descarta claves desconocidas", () => {
    expect(pickProductFields({ name: "Pizza", _id: "abc", createdAt: 1 })).toEqual({
      name: "Pizza",
    });
  });

  it("omite las claves ausentes en vez de ponerlas en undefined", () => {
    expect(Object.keys(pickProductFields({ name: "Pizza" }))).toEqual(["name"]);
  });

  it("conserva un valor null explicito", () => {
    expect(pickProductFields({ categoryId: null })).toEqual({ categoryId: null });
  });

  it("tolera un body vacio o ausente", () => {
    expect(pickProductFields({})).toEqual({});
    expect(pickProductFields()).toEqual({});
  });
});

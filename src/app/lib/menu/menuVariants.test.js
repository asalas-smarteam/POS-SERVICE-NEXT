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

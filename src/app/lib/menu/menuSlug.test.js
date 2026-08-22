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

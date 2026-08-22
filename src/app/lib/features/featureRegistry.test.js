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

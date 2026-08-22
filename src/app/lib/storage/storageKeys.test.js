import { describe, expect, it } from "vitest";
import { buildProductImageKey } from "@/lib/storage/storageKeys";

const VALID = {
  tenantId: "tenant-abc",
  productId: "650f1c2d3e4f5a6b7c8d9e0f",
  random: () => "a1b2c3d4",
};

describe("buildProductImageKey", () => {
  it("construye la clave con tenant, producto, sufijo y extension", () => {
    expect(buildProductImageKey({ ...VALID, format: "png" })).toBe(
      "tenants/tenant-abc/products/650f1c2d3e4f5a6b7c8d9e0f-a1b2c3d4.png"
    );
  });

  it("normaliza jpeg a jpg", () => {
    expect(buildProductImageKey({ ...VALID, format: "jpeg" })).toMatch(/\.jpg$/);
  });

  it("acepta el formato en mayusculas", () => {
    expect(buildProductImageKey({ ...VALID, format: "WEBP" })).toMatch(/\.webp$/);
  });

  it("rechaza un formato no soportado", () => {
    expect(() => buildProductImageKey({ ...VALID, format: "svg" })).toThrow(
      /Unsupported format/
    );
  });

  it("rechaza un productId que no es ObjectId", () => {
    expect(() =>
      buildProductImageKey({ ...VALID, productId: "../../etc/passwd", format: "png" })
    ).toThrow(/Invalid productId/);
  });

  it("rechaza un tenantId con separadores de ruta", () => {
    expect(() =>
      buildProductImageKey({ ...VALID, tenantId: "a/../b", format: "png" })
    ).toThrow(/Invalid tenantId/);
  });

  it("genera sufijos distintos en llamadas sucesivas sin random inyectado", () => {
    const first = buildProductImageKey({
      tenantId: VALID.tenantId,
      productId: VALID.productId,
      format: "png",
    });
    const second = buildProductImageKey({
      tenantId: VALID.tenantId,
      productId: VALID.productId,
      format: "png",
    });
    expect(first).not.toBe(second);
  });
});

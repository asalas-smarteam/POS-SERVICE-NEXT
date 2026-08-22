import { randomBytes } from "node:crypto";

// El nombre del archivo subido es entrada controlada por el usuario, asi que la
// clave se construye entera desde datos que el servidor ya validó. Los patrones
// no son cosmeticos: son lo que impide que un id inyecte segmentos de ruta.
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;
const TENANT_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/;

const EXTENSION_BY_FORMAT = Object.freeze({
  jpg: "jpg",
  jpeg: "jpg",
  png: "png",
  webp: "webp",
});

const defaultRandom = () => randomBytes(4).toString("hex");

export function buildProductImageKey({
  tenantId,
  productId,
  format,
  random = defaultRandom,
} = {}) {
  if (!TENANT_ID_PATTERN.test(String(tenantId ?? ""))) {
    throw new Error("Invalid tenantId");
  }

  if (!OBJECT_ID_PATTERN.test(String(productId ?? ""))) {
    throw new Error("Invalid productId");
  }

  const extension = EXTENSION_BY_FORMAT[String(format ?? "").toLowerCase()];
  if (!extension) {
    throw new Error(`Unsupported format '${format}'`);
  }

  return `tenants/${tenantId}/products/${productId}-${random()}.${extension}`;
}

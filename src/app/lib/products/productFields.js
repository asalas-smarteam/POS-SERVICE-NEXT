// Las rutas de products hacian `Product.create(body)` con el body completo. Con
// `image` en el esquema eso permitiria escribir una URL arbitraria salteandose
// toda la validacion de subida, asi que los campos aceptados son explicitos.
// `image` NO esta en la lista: solo lo escriben los endpoints de imagen.
export const PRODUCT_WRITABLE_FIELDS = Object.freeze([
  "name",
  "price",
  "categoryId",
  "productSizeId",
  "type",
  "ingredients",
  "allowsHalf",
  "allowsExtras",
  "requiresKitchen",
  "description",
]);

export function pickProductFields(body = {}) {
  const source = body ?? {};
  const picked = {};

  for (const field of PRODUCT_WRITABLE_FIELDS) {
    if (source[field] !== undefined) {
      picked[field] = source[field];
    }
  }

  return picked;
}

// Agrupa los productos de una categoria con talles en un plato por nombre
// (recortado) con una fila por talle debajo, en vez de repetir el plato una
// vez por talle. El nombre recortado es la unica clave que el modelo de datos
// ofrece para esto: Product no tiene un id de "plato" que una a sus variantes
// de talle (ver models/tenant/Product.js), solo `productSizeId` apuntando al
// talle. Dos platos genuinamente distintos que compartan nombre por error de
// carga se fusionarian en una sola entrada, mostrando la foto/descripcion de
// uno solo de ellos (el que quede primero segun el orden de talles) y sus
// talles todos mezclados bajo ese nombre.
export function groupProductsBySize(categoryProducts, sizeOrderMap) {
  const groups = new Map();

  for (const product of categoryProducts) {
    const key = product.name.trim();
    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key).push(product);
  }

  const orderOf = (product) => sizeOrderMap.get(product.sizeId)?.order ?? Infinity;

  return Array.from(groups.entries()).map(([name, groupProducts]) => {
    // Un producto cuyo talle no resuelve en el ajuste (borrado o desactivado)
    // igual tiene que aparecer: se ordena al final y su fila no lleva
    // etiqueta de talle, pero no se descarta.
    const sorted = [...groupProducts].sort((a, b) => orderOf(a) - orderOf(b));
    const first = sorted[0];

    return {
      id: first.id,
      name,
      description: first.description,
      image: first.image,
      sizes: sorted.map((product) => ({
        id: product.id,
        label: sizeOrderMap.get(product.sizeId)?.label ?? "",
        price: product.price,
      })),
    };
  });
}

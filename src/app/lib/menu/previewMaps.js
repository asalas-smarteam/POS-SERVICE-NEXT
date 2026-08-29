// JSON no transporta Map, asi que preview-data manda todo como arreglos y el
// cliente arma los Map que MenuBlockList espera. Esto vive en un modulo propio
// porque ahora lo necesitan dos: la previa, para renderizar, y el editor, para
// calcular el aviso de la tabla que cae. Duplicarlo dejaria al aviso mirando
// datos armados distinto de los que se renderizan.
const asArray = (value) => (Array.isArray(value) ? value : []);

export function buildPreviewMaps(data) {
  const source = data || {};

  // `active: true` no relaja el criterio estricto de renderableBlocks: el
  // endpoint ya devuelve solo categorias con active === true, y este campo es
  // lo que le permite al filtro reconocerlas. Sin el, la previa descartaria
  // todos los bloques de categoria.
  const categoryMap = new Map(
    asArray(source.categories).map((category) => [category.id, { ...category, active: true }]),
  );

  const productsByCategory = new Map();
  for (const product of asArray(source.products)) {
    if (!productsByCategory.has(product.categoryId)) {
      productsByCategory.set(product.categoryId, []);
    }
    productsByCategory.get(product.categoryId).push(product);
  }

  const sizeOrderMap = new Map(
    asArray(source.sizes).map((size) => [size.id, { label: size.label, order: size.order }]),
  );

  return { categoryMap, productsByCategory, sizeOrderMap };
}

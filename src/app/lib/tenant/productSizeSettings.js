import { TenantSettingModel } from '@/models/tenant/TenantSetting';

export const PRODUCT_SIZE_DESCRIPTION = 'Product Sizes';

// Lee la misma fila de ajustes que src/store/settingsStore.js consume para
// construir `sizeLookup` del lado del POS de ventas (un arreglo Mixed de
// { id, label, active }).
export async function getProductSizes(conn) {
  const TenantSetting = TenantSettingModel(conn);
  const doc = await TenantSetting.findOne({
    description: PRODUCT_SIZE_DESCRIPTION,
  }).lean();

  const rows = Array.isArray(doc?.data) ? doc.data : [];

  // Mismo criterio que `buildSizesData` en settingsStore.js: un talle sin
  // "active" explicito en false cuenta como activo. Es a proposito distinto
  // del "=== true" estricto de las categorias (ver menuSchema.js): ahi
  // desactivar oculta una seccion entera del menu, aca solo decide que
  // etiqueta de talle se ofrece.
  return rows.filter((row) => row?.id && row.active !== false);
}

// Map<sizeId, { label, order }>: el orden es la posicion del talle en el
// arreglo guardado, que es el orden en que el dueño los armo en el editor de
// ajustes. Es lo que define en que orden se listan los talles de un plato en
// el menu publico, no el nombre ni el precio.
export async function getProductSizeOrderMap(conn) {
  const sizes = await getProductSizes(conn);

  return new Map(
    sizes.map((row, index) => [
      String(row.id),
      { label: typeof row.label === 'string' ? row.label : '', order: index },
    ]),
  );
}

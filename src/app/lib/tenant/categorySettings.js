import { TenantSettingModel } from '@/models/tenant/TenantSetting';

export const PRODUCT_CATEGORY_DESCRIPTION = 'Product Category';

// Reads the "Product Category" tenant setting (a Mixed array of
// { id, label, active, hasSizes, requiresKitchen } rows).
export async function getProductCategories(conn) {
  const TenantSetting = TenantSettingModel(conn);
  const doc = await TenantSetting.findOne({
    description: PRODUCT_CATEGORY_DESCRIPTION,
  }).lean();

  return Array.isArray(doc?.data) ? doc.data : [];
}

// Map<categoryId, categoryRow> for resolving a product's category cheaply.
export async function getProductCategoryMap(conn) {
  const categories = await getProductCategories(conn);
  return new Map(
    categories.filter((row) => row?.id).map((row) => [String(row.id), row]),
  );
}

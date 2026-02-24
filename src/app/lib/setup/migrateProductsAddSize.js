import { ProductModel } from '@/models/tenant/Product';
import { ProductSizeModel } from '@/models/tenant/ProductSize';

export async function migrateProductsAddSize(conn) {
  const Product = ProductModel(conn);
  const ProductSize = ProductSizeModel(conn);

  const defaultSize = await ProductSize.findOne({ isDefault: true }).select('_id');

  if (!defaultSize) {
    return;
  }

  await Product.updateMany(
    {
      $or: [
        { sizeId: null },
        { sizeId: { $exists: false } },
      ],
    },
    {
      $set: { sizeId: defaultSize._id },
    }
  );
}

import { ProductSizeModel } from '@/models/tenant/ProductSize';

export async function ensureDefaultProductSize(conn) {
  const ProductSize = ProductSizeModel(conn);

  const existingSize = await ProductSize.findOne().sort({ createdAt: 1 });

  if (!existingSize) {
    await ProductSize.create({
      name: 'Normal',
      code: 'NORMAL',
      isDefault: true,
    });
    return;
  }

  const defaultSize = await ProductSize.findOne({ isDefault: true });

  if (!defaultSize) {
    await ProductSize.updateOne(
      { _id: existingSize._id },
      { $set: { isDefault: true } }
    );
  }
}

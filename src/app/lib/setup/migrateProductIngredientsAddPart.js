import { ProductModel } from '@/models/tenant/Product';

export async function migrateProductIngredientsAddPart(conn) {
  const Product = ProductModel(conn);

  const products = await Product.find({
    ingredients: { $exists: true, $ne: [] },
    'ingredients.part': { $exists: false },
  });

  for (const product of products) {
    let wasModified = false;

    for (const ingredient of product.ingredients) {
      if (ingredient.part === undefined) {
        ingredient.part = 'TOPPING';
        wasModified = true;
      }
    }

    if (wasModified) {
      await product.save();
    }
  }
}

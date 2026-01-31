import { ProductModel } from '@/models/tenant/Product';
import { IngredientModel } from '@/models/tenant/Ingredient';

export async function discountInventory(conn, order) {
  const Product = ProductModel(conn);
  const Ingredient = IngredientModel(conn);

  for (const item of order.items) {

    // Caso mitad / mitad
    const productsToProcess = item.halves?.length
      ? await Product.find({ _id: { $in: item.halves.map(h => h.productId) } })
      : [await Product.findById(item.productId)];

    for (const product of productsToProcess) {
      if (!product || product.type !== 'COMPOSED') continue;

      for (const pi of product.ingredients) {

        // ingrediente fue quitado
        if (item.removedIngredients?.includes(String(pi.ingredientId))) {
          continue;
        }

        let qty = pi.quantity * item.quantity;

        // extras
        const extra = item.extraIngredients?.find(
          e => String(e.ingredientId) === String(pi.ingredientId)
        );
        if (extra) qty += extra.quantity;

        await Ingredient.findByIdAndUpdate(
          pi.ingredientId,
          { $inc: { stock: -qty } }
        );
      }
    }
  }
}

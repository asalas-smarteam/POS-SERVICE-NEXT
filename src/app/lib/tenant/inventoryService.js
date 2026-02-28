import { ProductModel } from '@/models/tenant/Product';
import { IngredientModel } from '@/models/tenant/Ingredient';
import { calculateIngredientsToDiscount } from '@/lib/inventory/calculateIngredientsToDiscount';

export async function discountInventory(conn, order) {
  const Product = ProductModel(conn);
  const Ingredient = IngredientModel(conn);

  for (const item of order.items) {
    const productA = await Product.findById(item.productId).lean();
    if (!productA || productA.type !== 'COMPOSED') {
      continue;
    }

    let productB = null;
    const halfProductId = item?.halves?.[0]?.productId;

    if (item?.isHalfAndHalf && halfProductId) {
      productB = await Product.findById(halfProductId).lean();
    }

    const ingredientsToDiscount = calculateIngredientsToDiscount({
      itemQuantity: item.quantity,
      productA,
      productB,
      isHalfAndHalf: item.isHalfAndHalf,
      removedIngredients: item.removedIngredients,
      extraIngredients: item.extraIngredients,
    });

    for (const ingredient of ingredientsToDiscount.items) {
      await Ingredient.findByIdAndUpdate(ingredient.ingredientId, {
        $inc: { stock: -ingredient.quantity },
      });
    }
  }
}

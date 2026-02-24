import { ProductModel } from '@/models/tenant/Product';

const toSafeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
};

export async function calculateOrderTotal(conn, order) {
  const Product = ProductModel(conn);

  let total = 0;

  for (const item of order.items) {
    const quantity = Math.max(1, toSafeNumber(item?.quantity, 1));
    const storedUnitPrice = toSafeNumber(item?.unitPrice, toSafeNumber(item?.price, NaN));

    if (Number.isFinite(storedUnitPrice)) {
      total += storedUnitPrice * quantity;
      continue;
    }

    const product = await Product.findById(item.productId);
    if (!product) continue;

    let lineTotal = toSafeNumber(product.price) * quantity;

    if (item.extraIngredients?.length) {
      lineTotal += item.extraIngredients.length * 100 * quantity;
    }

    total += lineTotal;
  }

  return total;
}

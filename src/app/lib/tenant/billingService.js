import { ProductModel } from "@/models/tenant/Product";

export async function calculateOrderTotal(conn, order) {
  const Product = ProductModel(conn);

  let total = 0;

  for (const item of order.items) {
    // Producto base
    const product = await Product.findById(item.productId);
    if (!product) continue;

    let lineTotal = product.price * item.quantity;

    // Extras (si decides cobrar extra; aquí ejemplo simple)
    if (item.extraIngredients?.length) {
      // política simple: + ₡100 por extra por unidad
      lineTotal += item.extraIngredients.length * 100 * item.quantity;
    }

    total += lineTotal;
  }

  return total;
}

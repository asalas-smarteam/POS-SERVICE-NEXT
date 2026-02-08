import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { getTenantConnection } from "@/lib/db/connections";
import { IngredientModel } from "@/models/tenant/Ingredient";
import { OrderModel } from "@/models/tenant/Order";

export async function POST(req) {
  try {
    const body = await req.json();
    const ingredientId = body?.ingredientId;
    const quantity = Number(body?.quantity ?? 0);
    const orderId = body?.orderId;

    if (!ingredientId || !orderId || !Number.isFinite(quantity)) {
      return NextResponse.json(
        { error: "ingredientId, quantity, and orderId are required" },
        { status: 400 },
      );
    }

    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Ingredient = IngredientModel(conn);
    const Order = OrderModel(conn);

    await Ingredient.findByIdAndUpdate(ingredientId, {
      $inc: { stock: -Math.abs(quantity) },
    });

    await Order.findByIdAndUpdate(orderId, {
      inventoryDiscounted: true,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

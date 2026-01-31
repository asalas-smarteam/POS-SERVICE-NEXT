import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { discountInventory } from "@/lib/tenant/inventoryService";

export async function POST(req, context) {
  try {
    const { params } = context;
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID missing" }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const order = await Order.findById(orderId);

    if (!order || order.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Invalid order state" },
        { status: 400 },
      );
    }

    await discountInventory(conn, order);

    order.status = "COCINA";
    await order.save();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

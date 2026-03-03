import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
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
    await authorizeRequest(req, "orders");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const body = await req.json().catch(() => ({}));
    const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";

    const order = await Order.findById(orderId);

    if (!order || order.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Invalid order state" },
        { status: 400 },
      );
    }

    if (!order.inventoryDiscounted) {
      await discountInventory(conn, order);
      order.inventoryDiscounted = true;
    }

    order.customerName = customerName;
    order.status = "PENDING";
    order.kitchenStatus = "IN_PREPARATION";
    order.kitchenStartedAt = new Date();
    order.kitchenCompletedAt = null;
    await order.save();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { calculateOrderTotal } from "@/lib/tenant/billingService";

export async function POST(req, { params }) {
  try {
    const { id: orderId } = await params;

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, "orders");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const order = await Order.findById(orderId);

    if (!order || !["PENDING", "IN_PROGRESS", "KITCHEN"].includes(order.status)) {
      return NextResponse.json(
        { error: "Order not ready for checkout" },
        { status: 400 },
      );
    }

    const total = await calculateOrderTotal(conn, order);

    order.status = "READY";
    order.total = total;
    await order.save();

    return NextResponse.json({
      ok: true,
      orderId,
      total,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

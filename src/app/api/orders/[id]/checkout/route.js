import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { calculateOrderTotal } from "@/lib/tenant/billingService";
import { releaseOrderTable } from "@/lib/tenant/tableAssignment";

export async function POST(req, { params }) {
  try {
    const { id: orderId } = await params;

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, "orders");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const order = await Order.findById(orderId);

    // Any open order can be paid regardless of its kitchen progress; only
    // already closed/terminal orders are rejected.
    const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "DELETED"];
    if (!order || order.isClosed || TERMINAL_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: "Order not ready for checkout" },
        { status: 400 },
      );
    }

    const total = await calculateOrderTotal(conn, order);

    order.status = "COMPLETED";
    order.total = total;
    order.isClosed = true;
    order.closedAt = new Date();
    await order.save();

    await releaseOrderTable(conn, order);

    return NextResponse.json({
      ok: true,
      orderId,
      total,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

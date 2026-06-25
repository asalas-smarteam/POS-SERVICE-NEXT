import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";

const ALLOWED_STATUSES = ["IN_PREPARATION", "IN_OVEN", "READY", "CANCELLED"];

export async function POST(req, context) {
  try {
    const { params } = context;
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID missing" }, { status: 400 });
    }

    const body = await req.json();
    const nextStatus = body?.status;

    if (!ALLOWED_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, "kitchen");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const updates = {
      kitchenStatus: nextStatus,
    };

    if (nextStatus === "READY") {
      // Kitchen progress only. The order stays active (open) until it is paid;
      // the lifecycle status (order.status) is owned by the checkout flow.
      updates.kitchenCompletedAt = new Date();
    }

    if (nextStatus === "CANCELLED") {
      updates.status = "CANCELLED";
    }

    const order = await Order.findByIdAndUpdate(orderId, updates, { new: true });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

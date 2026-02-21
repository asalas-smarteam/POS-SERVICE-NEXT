import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";

const ALLOWED_STATUSES = ["EN_PREPARACION", "EN_HORNO", "LISTO", "CANCELADO"];
const VALID_TRANSITIONS = {
  EN_PREPARACION: ["EN_HORNO", "CANCELADO"],
  EN_HORNO: ["LISTO", "CANCELADO"],
  LISTO: [],
  CANCELADO: [],
};

export async function PATCH(req, { params }) {
  try {
    const { id: orderId } = await params;
    const { status: nextStatus } = await req.json();

    if (!orderId || !ALLOWED_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentStatus = order.kitchenStatus ?? "EN_PREPARACION";
    if (currentStatus !== nextStatus) {
      const allowedNext = VALID_TRANSITIONS[currentStatus] ?? [];
      if (!allowedNext.includes(nextStatus)) {
        return NextResponse.json({ error: "Invalid transition" }, { status: 400 });
      }
    }

    if (!order.kitchenStartedAt) {
      order.kitchenStartedAt = new Date();
    }

    order.kitchenStatus = nextStatus;

    if (nextStatus === "LISTO") {
      order.kitchenCompletedAt = new Date();
      order.status = "LISTO";
    }

    if (nextStatus === "CANCELADO") {
      order.status = "CANCELLED";
    }

    await order.save();
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

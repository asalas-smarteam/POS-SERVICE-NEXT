import { NextResponse } from "next/server";
import { requireModuleAccess } from "@/lib/security/featureAccess";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { releaseOrderTable } from "@/lib/tenant/tableAssignment";

const ALLOWED_STATUSES = ["IN_PREPARATION", "IN_OVEN", "READY", "DISPATCHED", "CANCELLED"];
const VALID_TRANSITIONS = {
  IN_PREPARATION: ["IN_OVEN", "CANCELLED"],
  IN_OVEN: ["READY", "CANCELLED"],
  // Dispatching only removes the ticket from the kitchen board; the order
  // lifecycle (order.status) remains owned by the checkout flow.
  READY: ["DISPATCHED"],
  DISPATCHED: [],
  CANCELLED: [],
};

export async function PATCH(req, { params }) {
  try {
    const { id: orderId } = await params;
    const { status: nextStatus } = await req.json();

    if (!orderId || !ALLOWED_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    // Solo el tablero de cocina llega hasta aca. Cancelar una orden desde la
    // lista de ordenes activas tiene su propio endpoint (POST /cancel), que no
    // depende de tener contratado el modulo de cocina.
    const { tenant } = await requireModuleAccess(req, "kitchen");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    // kitchenStatus null = la orden nunca se despacho a cocina (solo bebidas, o
    // el cajero desactivo el envio). No hay ticket que mover.
    if (!order.kitchenStatus) {
      return NextResponse.json({ error: "Order is not in the kitchen" }, { status: 400 });
    }

    const currentStatus = order.kitchenStatus;
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

    if (nextStatus === "READY") {
      // Kitchen progress only. The order stays active (open) until it is paid;
      // the lifecycle status (order.status) is owned by the checkout flow.
      order.kitchenCompletedAt = new Date();
    }

    if (nextStatus === "CANCELLED") {
      order.status = "CANCELLED";
    }

    await order.save();

    if (nextStatus === "CANCELLED") {
      await releaseOrderTable(conn, order);
    }

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: error.status || 500 });
  }
}

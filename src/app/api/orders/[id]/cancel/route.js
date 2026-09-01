import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest, requireRole } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { releaseOrderTable } from "@/lib/tenant/tableAssignment";

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "DELETED"];

// Cancelar una orden es parte del modulo de ordenes, no del de cocina.
// Antes la lista de ordenes activas cancelaba via PATCH kitchen-status, lo que
// dejaba una operacion basica del POS colgando de un modulo que ahora se puede
// no tener contratado.
export async function POST(req, { params }) {
  try {
    const { id: orderId } = await params;

    const tenant = await resolveTenant(req);
    // Cancelar es una accion administrativa: un cajero puede tomar y cobrar
    // ordenes, pero anularlas queda reservado al admin de la sede.
    const auth = await authorizeRequest(req, "orders");
    requireRole(auth, ["admin"]);

    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (order.isClosed || TERMINAL_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: "Order is already closed" },
        { status: 400 }
      );
    }

    order.status = "CANCELLED";

    // Si la orden llego a despacharse a cocina, se cancela tambien el ticket
    // para que salga del tablero (la query del board solo trae
    // IN_PREPARATION / IN_OVEN / READY).
    if (order.kitchenStatus) {
      order.kitchenStatus = "CANCELLED";
    }

    await order.save();
    await releaseOrderTable(conn, order);

    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json(
      { error: error.message },
      { status: error.status || 500 }
    );
  }
}

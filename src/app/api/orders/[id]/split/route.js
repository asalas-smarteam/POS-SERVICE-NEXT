import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "DELETED"];

// Actualiza la configuracion de division (splitEnabled + sub-cuentas) de una
// orden abierta. Preserva el estado de pago (isPaid) de cada sub-cuenta.
export async function PATCH(req, { params }) {
  try {
    const { id: orderId } = await params;

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, "orders");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const order = await Order.findById(orderId);
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.isClosed || TERMINAL_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: "Order can no longer be edited" },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));

    if (typeof body?.splitEnabled === "boolean") {
      order.splitEnabled = body.splitEnabled;
    }

    if (Array.isArray(body?.subAccounts)) {
      const prev = new Map((order.subAccounts || []).map((a) => [String(a.id), a]));
      order.subAccounts = body.subAccounts
        .filter((a) => a && a.id)
        .map((a) => {
          const existing = prev.get(String(a.id));
          return {
            id: String(a.id),
            name: String(a.name || "").trim(),
            isPaid: existing?.isPaid || false,
            paidAt: existing?.paidAt || null,
          };
        });
    }

    await order.save();
    return NextResponse.json(order);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

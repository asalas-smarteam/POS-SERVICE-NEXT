import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { TableModel } from "@/models/tenant/Table";

const ALLOWED_STATUSES = ["IN_PREPARATION", "IN_OVEN", "READY", "CANCELLED"];
const VALID_TRANSITIONS = {
  IN_PREPARATION: ["IN_OVEN", "CANCELLED"],
  IN_OVEN: ["READY", "CANCELLED"],
  READY: [],
  CANCELLED: [],
};

export async function PATCH(req, { params }) {
  try {
    const { id: orderId } = await params;
    const { status: nextStatus } = await req.json();

    if (!orderId || !ALLOWED_STATUSES.includes(nextStatus)) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, "orders");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);
    const Table = TableModel(conn);
    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const currentStatus = order.kitchenStatus ?? "IN_PREPARATION";
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
      if (order.orderType === "onTable" && order.tableId) {
        await Table.findOneAndUpdate(
          { id: order.tableId },
          { status: "available" },
          { new: false }
        );
      }
    }

    await order.save();
    return NextResponse.json(order);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

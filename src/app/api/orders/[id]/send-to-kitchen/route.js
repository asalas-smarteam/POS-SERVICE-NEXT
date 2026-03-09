import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { TableModel } from "@/models/tenant/Table";
import { discountInventory } from "@/lib/tenant/inventoryService";
import { getTenantOrderConfig, normalizePaymentMode } from "@/lib/tenant/orderMetadata";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

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
    const Table = TableModel(conn);

    const body = await req.json().catch(() => ({}));
    const customerName = normalizeText(body?.customerName);
    const incomingOrderType = normalizeText(body?.orderType);
    const incomingTableId = normalizeText(body?.tableId);
    const incomingTableLabel = normalizeText(body?.tableLabel);
    const incomingPaymentMode = normalizeText(body?.paymentMode);
    const { orderTypes, paymentModeDefault } = await getTenantOrderConfig(conn);

    const order = await Order.findById(orderId);

    if (!order || order.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Invalid order state" },
        { status: 400 },
      );
    }

    const selectedOrderType =
      orderTypes.find((type) => type.id === incomingOrderType) ||
      orderTypes.find((type) => type.id === order.orderType) ||
      orderTypes.find((type) => type.id === "takeaway") ||
      orderTypes[0];

    if (!selectedOrderType) {
      return NextResponse.json({ error: "No order types configured." }, { status: 400 });
    }

    const isOnTableOrder = selectedOrderType.id === "onTable";
    let tableId = null;
    let tableLabel = null;

    if (isOnTableOrder) {
      const resolvedTableId = incomingTableId || normalizeText(order.tableId);
      if (!resolvedTableId) {
        return NextResponse.json({ error: "tableId is required for onTable orders." }, { status: 400 });
      }

      const table = await Table.findOne({ id: resolvedTableId }).lean();
      if (!table) {
        return NextResponse.json({ error: "Selected table not found." }, { status: 400 });
      }

      tableId = table.id;
      tableLabel = incomingTableLabel || table.name || normalizeText(order.tableLabel) || null;
    }

    if (!order.inventoryDiscounted) {
      await discountInventory(conn, order);
      order.inventoryDiscounted = true;
    }

    order.customerName = customerName;
    order.orderType = selectedOrderType.id;
    order.tableId = tableId;
    order.tableLabel = tableLabel;
    order.paymentMode = normalizePaymentMode(incomingPaymentMode, paymentModeDefault);
    order.status = "PENDING";
    order.kitchenStatus = "IN_PREPARATION";
    order.kitchenStartedAt = new Date();
    order.kitchenCompletedAt = null;
    order.isClosed = false;
    order.closedAt = null;
    await order.save();

    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

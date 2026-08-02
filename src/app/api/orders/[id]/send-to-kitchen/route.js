import { NextResponse } from "next/server";
import { requireModuleAccess } from "@/lib/security/featureAccess";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { discountInventory } from "@/lib/tenant/inventoryService";
import { getTenantOrderConfig, normalizePaymentMode } from "@/lib/tenant/orderMetadata";
import { itemRequiresKitchen } from "@/lib/tenant/kitchenRouting";
import { occupyOrderTable, resolveTableReference } from "@/lib/tenant/tableAssignment";
import { hasFeature } from "@/lib/features/featureRegistry";

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

export async function POST(req, context) {
  try {
    const { params } = context;
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: "Order ID missing" }, { status: 400 });
    }

    const { tenant } = await requireModuleAccess(req, "orders");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);
    const hasFloor = hasFeature(tenant.features, "floor");
    const hasKitchen = hasFeature(tenant.features, "kitchen");

    const body = await req.json().catch(() => ({}));
    const customerName = normalizeText(body?.customerName);
    const incomingOrderType = normalizeText(body?.orderType);
    const incomingTableId = normalizeText(body?.tableId);
    const incomingTableLabel = normalizeText(body?.tableLabel);
    const incomingPaymentMode = normalizeText(body?.paymentMode);
    const { orderTypes, paymentModeDefault, paymentModeOptions } = await getTenantOrderConfig(conn);

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
      ({ tableId, tableLabel } = await resolveTableReference({
        conn,
        hasFloor,
        incomingTableId,
        incomingTableLabel,
        currentTableId: normalizeText(order.tableId),
        currentTableLabel: normalizeText(order.tableLabel),
      }));
    }

    // Sin el modulo de inventario no hay recetas que descontar.
    if (!order.inventoryDiscounted && hasFeature(tenant.features, "ingredients")) {
      await discountInventory(conn, order);
      order.inventoryDiscounted = true;
    }

    order.customerName = customerName;
    order.orderType = selectedOrderType.id;
    order.tableId = tableId;
    order.tableLabel = tableLabel;
    order.paymentMode = normalizePaymentMode(incomingPaymentMode, paymentModeDefault, paymentModeOptions);
    order.status = "PENDING";
    // La orden solo entra al tablero de cocina si la cuenta tiene el modulo
    // contratado, algun producto requiere preparacion (ver
    // lib/tenant/kitchenRouting.js) y el cajero no lo desactivo en el checkout.
    // El resto de este endpoint (inventario, estado PENDING, mesa ocupada)
    // corre igual: una orden sin despacho a cocina sigue siendo activa.
    const dispatchKitchen =
      hasKitchen &&
      body?.sendToKitchen !== false &&
      (order.items || []).some((item) => itemRequiresKitchen(item));
    order.kitchenStatus = dispatchKitchen ? "IN_PREPARATION" : null;
    order.kitchenStartedAt = dispatchKitchen ? new Date() : null;
    order.kitchenCompletedAt = null;
    order.isClosed = false;
    order.closedAt = null;
    await order.save();

    await occupyOrderTable(conn, order);

    return NextResponse.json({ ok: true, dispatchedToKitchen: dispatchKitchen });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

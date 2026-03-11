import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { authorizeRequest } from '@/lib/security/authorizeRequest';
import { getTenantConnection } from '@/lib/db/connections';
import { OrderModel } from '@/models/tenant/Order';
import { TableModel } from '@/models/tenant/Table';
import { getTenantOrderConfig, normalizePaymentMode } from '@/lib/tenant/orderMetadata';

const normalizeText = (value) =>
  typeof value === "string" ? value.trim() : "";

const ACTIVE_ORDER_STATUSES = ['DRAFT', 'KITCHEN', 'PENDING', 'IN_PROGRESS'];

export async function GET(req) {
  try {
    const tenant = await resolveTenant(req);
    await authorizeRequest(req, 'orders');
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const { searchParams } = new URL(req.url);
    const tableId = normalizeText(searchParams.get('tableId'));
    const onlyActive = searchParams.get('active') === 'true';

    const query = {};

    if (tableId) {
      query.tableId = tableId;
    }

    if (onlyActive) {
      query.isClosed = false;
      query.status = { $in: ACTIVE_ORDER_STATUSES };
    }

    if (tableId && onlyActive) {
      const order = await Order.findOne(query).sort({ createdAt: -1 }).lean();
      return NextResponse.json(order || null);
    }

    const orders = await Order.find(query).sort({ createdAt: -1 }).lean();
    return NextResponse.json(orders);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const tenant = await resolveTenant(req);
    await authorizeRequest(req, 'orders');
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);
    const Table = TableModel(conn);

    const body = await req.json().catch(() => ({}));
    const customerName = normalizeText(body?.customerName);
    const incomingOrderType = normalizeText(body?.orderType);
    const incomingTableId = normalizeText(body?.tableId);
    const incomingTableLabel = normalizeText(body?.tableLabel);
    const incomingPaymentMode = normalizeText(body?.paymentMode);
    const { orderTypes, paymentModeDefault, paymentModeOptions } = await getTenantOrderConfig(conn);

    const selectedOrderType =
      orderTypes.find((type) => type.id === incomingOrderType) ||
      orderTypes.find((type) => type.id === "takeaway") ||
      orderTypes[0];

    if (!selectedOrderType) {
      return NextResponse.json({ error: "No order types configured." }, { status: 400 });
    }

    const isOnTableOrder = selectedOrderType.id === "onTable";
    let tableId = null;
    let tableLabel = null;

    if (isOnTableOrder) {
      if (!incomingTableId) {
        return NextResponse.json({ error: "tableId is required for onTable orders." }, { status: 400 });
      }

      const table = await Table.findOne({ id: incomingTableId }).lean();
      if (!table) {
        return NextResponse.json({ error: "Selected table not found." }, { status: 400 });
      }

      tableId = table.id;
      tableLabel = incomingTableLabel || table.name || null;
    }

    const order = await Order.create({
      customerName,
      orderType: selectedOrderType.id,
      tableId,
      tableLabel,
      paymentMode: normalizePaymentMode(incomingPaymentMode, paymentModeDefault, paymentModeOptions),
      isClosed: false,
      closedAt: null,
    });
    return NextResponse.json(order);

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

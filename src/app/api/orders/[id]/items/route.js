import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { authorizeRequest } from '@/lib/security/authorizeRequest';
import { getTenantConnection } from '@/lib/db/connections';
import { OrderModel } from '@/models/tenant/Order';
import {
  calculateAndBuildOrderItem,
  recalculateOrderTotals,
} from '@/lib/tenant/orderPricing';

const TERMINAL_STATUSES = ['COMPLETED', 'CANCELLED', 'DELETED'];

export async function POST(req, context) {
  try {
    const { params } = context;
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json(
        { error: 'Order ID missing' },
        { status: 400 }
      );
    }

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, 'orders');
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const body = await req.json();
    const builtItemResult = await calculateAndBuildOrderItem(conn, body);

    if (builtItemResult?.error) {
      return NextResponse.json(
        { error: builtItemResult.error },
        { status: builtItemResult.status || 400 }
      );
    }

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    order.items.push(builtItemResult.item);
    recalculateOrderTotals(order);
    await order.save();

    return NextResponse.json(order);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Replace the whole items array with the provided cart. Used to save edits to an
// open order (add/remove products, change quantities) without creating
// duplicate lines.
export async function PUT(req, context) {
  try {
    const { params } = context;
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Order ID missing' }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, 'orders');
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const body = await req.json().catch(() => ({}));
    const inputItems = Array.isArray(body?.items) ? body.items : [];

    const order = await Order.findById(orderId);

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.isClosed || TERMINAL_STATUSES.includes(order.status)) {
      return NextResponse.json(
        { error: 'Order can no longer be edited' },
        { status: 400 }
      );
    }

    const builtItems = [];
    for (const itemInput of inputItems) {
      const result = await calculateAndBuildOrderItem(conn, itemInput);
      if (result?.error) {
        return NextResponse.json(
          { error: result.error },
          { status: result.status || 400 }
        );
      }
      builtItems.push(result.item);
    }

    order.items = builtItems;
    recalculateOrderTotals(order);
    await order.save();

    return NextResponse.json(order);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

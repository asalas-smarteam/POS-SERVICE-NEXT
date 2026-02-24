import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { OrderModel } from '@/models/tenant/Order';
import {
  calculateAndBuildOrderItem,
  recalculateOrderTotals,
} from '@/lib/tenant/orderPricing';

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

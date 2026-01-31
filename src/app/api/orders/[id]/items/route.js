import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { OrderModel } from '@/models/tenant/Order';

export async function POST(req, context) {
  try {
    
    const { params } = context;
    const { id: orderId } = await params;

    console.log('Adding item to order ID:', orderId);

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

    const order = await Order.findByIdAndUpdate(
      orderId,
      { $push: { items: body } },
      { new: true }
    );

    if (!order) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(order);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

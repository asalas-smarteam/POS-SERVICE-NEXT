import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { OrderModel } from '@/models/tenant/Order';

export async function GET(req) {
  try {
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const tickets = await Order.find({ status: 'COCINA' })
      .sort({ createdAt: 1 });

    return NextResponse.json(tickets);

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { OrderModel } from '@/models/tenant/Order';

export async function POST(req) {
  try {
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const order = await Order.create({});
    return NextResponse.json(order);

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { OrderModel } from '@/models/tenant/Order';

export async function POST(req) {
  try {
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const body = await req.json().catch(() => ({}));
    const customerName = typeof body?.customerName === "string" ? body.customerName.trim() : "";

    const order = await Order.create({ customerName });
    return NextResponse.json(order);

  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

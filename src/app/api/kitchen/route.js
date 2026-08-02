import { NextResponse } from 'next/server';
import { requireModuleAccess } from '@/lib/security/featureAccess';
import { getTenantConnection } from '@/lib/db/connections';
import { OrderModel } from '@/models/tenant/Order';

export async function GET(req) {
  try {
    const { tenant } = await requireModuleAccess(req, 'kitchen');
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const tickets = await Order.find({
      kitchenStatus: {
        $in: ['IN_PREPARATION', 'IN_OVEN', 'READY'],
      },
    }).sort({ createdAt: 1 });

    return NextResponse.json(tickets);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

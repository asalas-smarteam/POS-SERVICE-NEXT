import { NextResponse } from 'next/server';
import { connectMasterDB } from '@/lib/db/master';
import { ensureDefaultPlans } from '@/lib/master/plans';

export async function GET() {
  try {
    const masterConn = await connectMasterDB();
    const Plan = await ensureDefaultPlans(masterConn);

    const plans = await Plan.find(
      { isActive: true },
      { _id: 0, name: 1, slug: 1, description: 1, priceMonthly: 1 }
    )
      .sort({ priceMonthly: 1 })
      .lean();

    return NextResponse.json(plans);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

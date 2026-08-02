import { NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { getCompanySubscription } from '@/lib/master/companySubscription';

// Plan, features y desglose mensual de la empresa del dueño.
export async function GET(req) {
  try {
    const { companyId } = await getOwnerContext(req);

    const masterConn = await connectMasterDB();
    const { company, plan, features, breakdown, availableFeatures } =
      await getCompanySubscription(masterConn, companyId);

    return NextResponse.json({
      plan: plan
        ? {
            slug: plan.slug,
            name: plan.name,
            description: plan.description,
            isCustomizable: Boolean(plan.isCustomizable),
          }
        : null,
      branchCount: company.branchCount,
      features,
      breakdown,
      availableFeatures,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to load subscription' : error.message },
      { status }
    );
  }
}

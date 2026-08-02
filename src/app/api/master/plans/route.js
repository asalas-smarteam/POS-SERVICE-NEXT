import { NextResponse } from 'next/server';
import { connectMasterDB } from '@/lib/db/master';
import { ensureDefaultPlans } from '@/lib/master/plans';
import { getActivePromotions } from '@/lib/master/promotions';

// Publico a proposito: el registro necesita listar planes antes de que exista
// una sesion. Por eso solo expone planes marcados como publicos, nunca el plan
// custom ni los entitlements de una empresa concreta.
export async function GET() {
  try {
    const masterConn = await connectMasterDB();
    const Plan = await ensureDefaultPlans(masterConn);

    const [plans, promotions] = await Promise.all([
      Plan.find(
        { isActive: true, isPubliclySelectable: true },
        {
          _id: 0,
          name: 1,
          slug: 1,
          description: 1,
          priceMonthly: 1,
          basePrice: 1,
          pricePerExtraBranch: 1,
          features: 1,
          isComingSoon: 1,
        }
      )
        // Los "proximamente" van al final; el resto por precio ascendente, que
        // es el orden en que el registro autoselecciona el primero.
        .sort({ isComingSoon: 1, priceMonthly: 1 })
        .lean(),
      getActivePromotions(masterConn),
    ]);

    return NextResponse.json({ plans, promotions });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

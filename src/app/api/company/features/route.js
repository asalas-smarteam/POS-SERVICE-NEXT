import { NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { activateCompanyFeature } from '@/lib/master/companySubscription';
import { signToken } from '@/lib/auth/jwt';
import { setAuthCookie } from '@/lib/auth/cookie';

// Activa un modulo adicional para la empresa. No hay cobro: se habilita en el
// momento, se propaga a todas las sedes y se recalcula lo que el cliente pasa a
// pagar. La pasarela de pago es una fase posterior.
export async function POST(req) {
  try {
    const { payload, companyId } = await getOwnerContext(req);

    const body = await req.json().catch(() => ({}));
    const featureKey = String(body?.key || '').trim();

    if (!featureKey) {
      return NextResponse.json({ error: 'Feature key is required' }, { status: 400 });
    }

    const masterConn = await connectMasterDB();
    const { features, breakdown } = await activateCompanyFeature(
      masterConn,
      companyId,
      featureKey
    );

    const response = NextResponse.json({ ok: true, features, breakdown });

    // El dueño esta logueado ahora mismo: si ya entro a una sede, se le reemite
    // el token con los features frescos para que el cambio sea inmediato en vez
    // de esperar al proximo login.
    if (payload?.tenantId) {
      const { exp, iat, ...claims } = payload;
      const refreshed = await signToken({ ...claims, features });
      setAuthCookie(response, refreshed);
    }

    return response;
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to activate feature' : error.message },
      { status }
    );
  }
}

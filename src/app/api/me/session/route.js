import { NextResponse } from 'next/server';
import { signToken, verifyToken } from '@/lib/auth/jwt';
import { setAuthCookie } from '@/lib/auth/cookie';
import { getTenantConnection } from '@/lib/db/connections';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { RoleNavModel } from '@/models/tenant/RoleNav';
import { filterNavByFeatures } from '@/lib/auth/roles';
import { resolveFeatures } from '@/lib/features/featureRegistry';

// Refresco de sesion. El token dura 7 dias y lleva los entitlements adentro,
// asi que un cambio de plan no se veria hasta el proximo login. El cliente
// llama a este endpoint al montar el dashboard: relee Tenant.features, reemite
// la cookie y devuelve el nav ya filtrado.
export async function GET(req) {
  try {
    const token = req.cookies.get('auth_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyToken(token);

    // Dueño en el panel: todavia no esta dentro de ninguna sede.
    if (!payload?.tenantId) {
      return NextResponse.json({ features: [], navMain: [] });
    }

    const tenant = await resolveTenant(req);
    const features = resolveFeatures(tenant.features);

    const tenantConn = await getTenantConnection(tenant.dbName);
    const RoleNav = RoleNavModel(tenantConn);
    const roleNav = await RoleNav.findOne({
      role: String(payload.role || '').toUpperCase(),
    }).lean();

    const navMain = filterNavByFeatures(roleNav?.navItems, features);

    // Reemite el token con los mismos claims y los features frescos, para que
    // el middleware deje de bloquear (o empiece a bloquear) de inmediato.
    const { exp, iat, ...claims } = payload;
    const refreshed = await signToken({ ...claims, features });

    const response = NextResponse.json({ features, navMain });
    setAuthCookie(response, refreshed);
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: error.message || 'Failed to refresh session' },
      { status: error.status || 401 }
    );
  }
}

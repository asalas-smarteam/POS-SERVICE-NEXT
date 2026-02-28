import { verifyToken } from '@/lib/auth/jwt';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { UserModel } from '@/models/tenant/User';

function getTokenFromRequest(req) {
  const authHeader = req.headers.get('authorization');

  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  return req.cookies.get('auth_token')?.value ?? null;
}

export async function getAuthContext(req) {
  const token = getTokenFromRequest(req);

  if (!token) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  const tenant = await resolveTenant(req);
  if (String(payload?.tenantId || '') !== String(tenant?.tenantId || '')) {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }

  const conn = await getTenantConnection(tenant.dbName);
  const User = UserModel(conn);
  const authUser = await User.findById(payload.userId);

  if (!authUser || authUser.isActive === false) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  return {
    payload,
    tenant,
    conn,
    User,
    authUser,
  };
}

export function requireAdmin(authUser) {
  if (authUser?.role !== 'ADMIN') {
    const error = new Error('Forbidden');
    error.status = 403;
    throw error;
  }
}

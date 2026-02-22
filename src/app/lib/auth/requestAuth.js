import { verifyToken } from '@/lib/auth/jwt';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { UserModel } from '@/models/tenant/User';

export async function getAuthContext(req) {
  const authHeader = req.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  const token = authHeader.replace('Bearer ', '');
  const payload = verifyToken(token);

  const tenant = await resolveTenant(req);
  if (payload.tenant !== tenant.slug) {
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

import { verifyToken } from '@/lib/auth/jwt';

export async function getAuthContext(request) {
  const token = request.cookies.get('auth_token')?.value;

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

  const userId = payload?.userId ? String(payload.userId) : '';
  const tenantId = payload?.tenantId ? String(payload.tenantId) : '';
  const role = payload?.role ? String(payload.role).toUpperCase() : '';

  if (!userId || !tenantId || !role) {
    const error = new Error('Unauthorized');
    error.status = 401;
    throw error;
  }

  return { userId, tenantId, role };
}

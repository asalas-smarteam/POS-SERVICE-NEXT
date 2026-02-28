import { verifyToken } from '../auth/jwt';
import { canRoleAccessModule } from '@/lib/security/rolePermissions';

function unauthorizedError(message = 'Unauthorized') {
  const error = new Error(message);
  error.status = 401;
  return error;
}

function forbiddenError(message = 'Forbidden') {
  const error = new Error(message);
  error.status = 403;
  return error;
}

function getCookieValue(request, name) {
  if (!request || !name) {
    return null;
  }

  if (request.cookies?.get) {
    const cookie = request.cookies.get(name);
    return typeof cookie === 'string' ? cookie : cookie?.value ?? null;
  }

  const cookieHeader = request.headers?.get?.('cookie');
  if (!cookieHeader) {
    return null;
  }

  const matchedCookie = cookieHeader
    .split(';')
    .map((segment) => segment.trim())
    .find((segment) => segment.startsWith(`${name}=`));

  if (!matchedCookie) {
    return null;
  }

  return decodeURIComponent(matchedCookie.slice(name.length + 1));
}

export async function authorizeRequest(request, moduleName) {
  const token = getCookieValue(request, 'auth_token');

  if (!token) {
    throw unauthorizedError('Unauthorized');
  }

  if (!moduleName) {
    throw forbiddenError("Invalid module");
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch (_error) {
    throw unauthorizedError('Unauthorized');
  }

  const normalizedRole = String(payload?.role ?? '').toLowerCase();
  const hasAccess = canRoleAccessModule(normalizedRole, moduleName);

  if (!hasAccess) {
    throw forbiddenError('Forbidden');
  }

  return payload;
}

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

const ROUTE_PERMISSIONS = {
  ADMIN: ['dashboard', 'orders', 'kitchen', 'users', 'settings'],
  KITCHEN: ['kitchen'],
  CASHIER: ['orders'],
};

const DEFAULT_ROLE_ROUTE = {
  ADMIN: 'dashboard',
  KITCHEN: 'kitchen',
  CASHIER: 'orders',
};

function getPathContext(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  const section = segments[0] || '';
  const tenantId = segments[1] || '';
  return { section, tenantId };
}

function buildRoleRedirectUrl(role, tenantId, requestUrl) {
  const fallbackSection = DEFAULT_ROLE_ROUTE[role] || 'login';
  const path = tenantId ? `/${fallbackSection}/${tenantId}` : `/${fallbackSection}`;
  return new URL(path, requestUrl);
}

function unauthorizedResponse(requestUrl) {
  return NextResponse.redirect(new URL('/login', requestUrl));
}

export function middleware(request) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    return unauthorizedResponse(request.url);
  }

  let decodedToken;
  try {
    decodedToken = verifyToken(token);
  } catch {
    return unauthorizedResponse(request.url);
  }

  const tokenTenantId = String(decodedToken?.tenantId || '');
  const role = String(decodedToken?.role || '').toUpperCase();
  const { section, tenantId: urlTenantId } = getPathContext(request.nextUrl.pathname);

  if (!tokenTenantId || !urlTenantId || urlTenantId !== tokenTenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allowedSections = ROUTE_PERMISSIONS[role] || [];
  if (!allowedSections.includes(section)) {
    return NextResponse.redirect(buildRoleRedirectUrl(role, tokenTenantId, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/orders/:path*',
    '/kitchen/:path*',
    '/users/:path*',
    '/settings/:path*',
  ],
};

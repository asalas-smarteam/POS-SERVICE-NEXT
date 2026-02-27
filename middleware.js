import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { defaultLocale, locales } from './i18n';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
});

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
  const hasLocale = locales.includes(segments[0]);
  const locale = hasLocale ? segments[0] : defaultLocale;
  const section = hasLocale ? segments[1] || '' : segments[0] || '';
  const tenantId = hasLocale ? segments[2] || '' : segments[1] || '';

  return { locale, section, tenantId };
}

function buildRoleRedirectUrl(role, tenantId, locale, requestUrl) {
  const fallbackSection = DEFAULT_ROLE_ROUTE[role] || 'login';
  const path = tenantId
    ? `/${locale}/${fallbackSection}/${tenantId}`
    : `/${locale}/${fallbackSection}`;
  return new URL(path, requestUrl);
}

function unauthorizedResponse(requestUrl, locale) {
  return NextResponse.redirect(new URL(`/${locale}/login`, requestUrl));
}

export function middleware(request) {
  const intlResponse = intlMiddleware(request);
  const { locale, section, tenantId: urlTenantId } = getPathContext(request.nextUrl.pathname);

  const protectedSections = new Set(['dashboard', 'orders', 'kitchen', 'users', 'settings']);
  if (!protectedSections.has(section)) {
    return intlResponse;
  }

  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return unauthorizedResponse(request.url, locale);
  }

  let decodedToken;
  try {
    decodedToken = verifyToken(token);
  } catch {
    return unauthorizedResponse(request.url, locale);
  }

  const tokenTenantId = String(decodedToken?.tenantId || '');
  const role = String(decodedToken?.role || '').toUpperCase();

  if (!tokenTenantId || !urlTenantId || urlTenantId !== tokenTenantId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const allowedSections = ROUTE_PERMISSIONS[role] || [];
  if (!allowedSections.includes(section)) {
    return NextResponse.redirect(
      buildRoleRedirectUrl(role, tokenTenantId, locale, request.url),
    );
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
};

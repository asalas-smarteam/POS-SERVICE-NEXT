import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { defaultLocale, locales } from './i18n';
import { isPublicRoute } from './lib/security/routeDefinitions';
import { resolveModuleFromPath } from './lib/security/resolveModule';

import {
  canRoleAccessModule,
  getDefaultModuleForRole,
} from './lib/security/rolePermissions';

const intlMiddleware = createMiddleware({
  locales,
  defaultLocale,
});

function getLocaleFromPath(pathname) {
  const segments = pathname.split('/').filter(Boolean);
  return locales.includes(segments[0]) ? segments[0] : defaultLocale;
}

function redirectToLogin(requestUrl, locale) {
  return NextResponse.redirect(new URL(`/${locale}/login`, requestUrl));
}

function redirectToRoleDefaultModule({ requestUrl, locale, role, tenantId }) {
  const fallbackModule = getDefaultModuleForRole(role);

  if (!fallbackModule || !tenantId) {
    return redirectToLogin(requestUrl, locale);
  }

  return NextResponse.redirect(
    new URL(`/${locale}/${fallbackModule}/${tenantId}`, requestUrl),
  );
}

export function middleware(request) {
  const intlResponse = intlMiddleware(request);
  const { pathname } = request.nextUrl;
  const locale = getLocaleFromPath(pathname);

  if (isPublicRoute(pathname, locales)) {
    return intlResponse;
  }

  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return redirectToLogin(request.url, locale);
  }

  let decodedToken;
  try {
    decodedToken = verifyToken(token);
  } catch {
    return redirectToLogin(request.url, locale);
  }

  const { module: moduleName, tenantId: urlTenantId } = resolveModuleFromPath(pathname, locales);

  if (!moduleName) {
    return intlResponse;
  }

  const tokenTenantId = String(decodedToken?.tenantId || '');
  const role = String(decodedToken?.role || '').toLowerCase();
  const hasModuleAccess = canRoleAccessModule(role, moduleName);
  const hasTenantAccess = Boolean(tokenTenantId && urlTenantId && tokenTenantId === urlTenantId);

  if (!hasModuleAccess || !hasTenantAccess) {
    return redirectToRoleDefaultModule({
      requestUrl: request.url,
      locale,
      role,
      tenantId: tokenTenantId,
    });
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
};

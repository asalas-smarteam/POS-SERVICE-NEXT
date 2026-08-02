import createMiddleware from 'next-intl/middleware';
import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';
import { defaultLocale, locales } from '../i18n';
import { isPublicRoute } from '@/lib/security/routeDefinitions';
import { resolveModuleFromPath, resolveAdminPanelFromPath } from '@/lib/security/resolveModule';

import {
  canRoleAccessModule,
  resolveFallbackModule,
} from '@/lib/security/rolePermissions';
import { hasFeature } from '@/lib/features/featureRegistry';

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

function redirectToRoleDefaultModule({ requestUrl, locale, role, tenantId, features }) {
  const fallbackModule = resolveFallbackModule(role, features);

  if (!fallbackModule || !tenantId) {
    return redirectToLogin(requestUrl, locale);
  }

  return NextResponse.redirect(
    new URL(`/${locale}/${fallbackModule}/${tenantId}`, requestUrl),
  );
}

export async function middleware(request) {
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
    decodedToken = await verifyToken(token);
  } catch(err) {
    return redirectToLogin(request.url, locale);
  }

  const isOwner = decodedToken?.kind === 'owner';
  const tokenTenantId = String(decodedToken?.tenantId || '');
  const tokenCompanyId = String(decodedToken?.companyId || '');
  const role = String(decodedToken?.role || '').toLowerCase();
  // Copia de los entitlements en el token: el middleware corre en edge y no
  // puede consultar mongo. Es la via rapida para gatear paginas; la autoridad
  // es Tenant.features, que cada endpoint revalida.
  const features = Array.isArray(decodedToken?.features) ? decodedToken.features : [];

  // Panel administrativo del dueño (company-scoped, sin tenantId): solo el dueño
  // de esa empresa puede entrar.
  const adminPanel = resolveAdminPanelFromPath(pathname, locales);
  if (adminPanel) {
    if (isOwner && tokenCompanyId && tokenCompanyId === adminPanel.companyId) {
      return intlResponse;
    }
    return redirectToLogin(request.url, locale);
  }

  const { module: moduleName, tenantId: urlTenantId } = resolveModuleFromPath(pathname, locales);

  if (!moduleName) {
    return intlResponse;
  }

  // Dueño sin sede activa (estado panel) que intenta abrir un modulo de sede →
  // devolver al panel en vez de a login.
  if (isOwner && !tokenTenantId) {
    return NextResponse.redirect(new URL(`/${locale}/admin/${tokenCompanyId}`, request.url));
  }

  // Acceso efectivo = lo que el rol permite ∩ lo que la cuenta contrato.
  const hasModuleAccess = canRoleAccessModule(role, moduleName);
  const hasPlanAccess = hasFeature(features, moduleName);
  const hasTenantAccess = Boolean(tokenTenantId && urlTenantId && tokenTenantId === urlTenantId);

  if (!hasModuleAccess || !hasPlanAccess || !hasTenantAccess) {
    if (isOwner && tokenCompanyId) {
      return NextResponse.redirect(new URL(`/${locale}/admin/${tokenCompanyId}`, request.url));
    }
    return redirectToRoleDefaultModule({
      requestUrl: request.url,
      locale,
      role,
      tenantId: tokenTenantId,
      features,
    });
  }

  return intlResponse;
}

export const config = {
  matcher: ['/((?!api|_next|favicon.ico|.*\\..*).*)'],
};

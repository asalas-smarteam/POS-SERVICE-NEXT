import { connectMasterDB } from '@/lib/db/master';
import { TenantModel } from '@/models/master/Tenant';
import { verifyToken } from '@/lib/auth/jwt';

export async function resolveTenant(request) {
  const masterConn = await connectMasterDB();
  const Tenant = TenantModel(masterConn);

  const token = request.cookies.get('auth_token')?.value;

  // El token (JWT en cookie httpOnly) es la fuente de verdad. Si hay sesion, la
  // sede se determina EXCLUSIVAMENTE por el token; nunca por el header
  // x-tenant-id (que el cliente construye desde su store y puede venir viejo).
  if (token) {
    let payload = null;
    try {
      payload = await verifyToken(token);
    } catch {
      throw new Error('Tenant not found or inactive');
    }

    const tokenTenantId = payload?.tenantId ? String(payload.tenantId) : null;
    if (!tokenTenantId) {
      // Sesion sin sede activa (p. ej. dueno en el panel administrativo).
      throw new Error('Tenant not found or inactive');
    }

    const tenant = await Tenant.findOne({ tenantId: tokenTenantId });
    if (!tenant || tenant.status !== 'active') {
      throw new Error('Tenant not found or inactive');
    }
    return tenant;
  }

  // Sin token: fallback legacy por headers (llamadas sin sesion).
  const tenantIdHeader = request.headers.get('x-tenant-id');
  const legacyTenantSlug = request.headers.get('x-tenant');

  const tenantFilters = [
    ...(tenantIdHeader ? [{ tenantId: tenantIdHeader }] : []),
    ...(legacyTenantSlug ? [{ slug: legacyTenantSlug }] : []),
  ];

  if (!tenantFilters.length) {
    throw new Error('Tenant not found or inactive');
  }

  const tenant = await Tenant.findOne({ $or: tenantFilters });

  if (!tenant || tenant.status !== 'active') {
    throw new Error('Tenant not found or inactive');
  }

  return tenant;
}

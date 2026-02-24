import { connectMasterDB } from '@/lib/db/master';
import { TenantModel } from '@/models/master/Tenant';
import { verifyToken } from '@/lib/auth/jwt';

function getTenantIdFromCookie(request) {
  const token = request.cookies.get('auth_token')?.value;
  if (!token) {
    return null;
  }

  try {
    const payload = verifyToken(token);
    return payload?.tenantId ? String(payload.tenantId) : null;
  } catch {
    return null;
  }
}

export async function resolveTenant(request) {
  const tenantIdFromToken = getTenantIdFromCookie(request);
  const tenantIdHeader = request.headers.get('x-tenant-id');
  const legacyTenantSlug = request.headers.get('x-tenant');

  const masterConn = await connectMasterDB();
  const Tenant = TenantModel(masterConn);

  const tenantFilters = [
    ...(tenantIdFromToken ? [{ tenantId: tenantIdFromToken }] : []),
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

  if (tenantIdFromToken && String(tenant.tenantId) !== tenantIdFromToken) {
    throw new Error('Tenant not found or inactive');
  }

  return tenant;
}

import { connectMasterDB } from '@/lib/db/master';
import { verifyToken } from '@/lib/auth/jwt';
import { TenantModel } from '@/models/master/Tenant';

export async function resolveTenantFromToken(request) {
  const token = request.cookies.get('auth_token')?.value;

  if (!token) {
    throw new Error('auth_token cookie is required');
  }

  const payload = await verifyToken(token);
  const tenantId = payload?.tenantId;

  if (!tenantId) {
    throw new Error('Token does not contain tenantId');
  }

  const masterConn = await connectMasterDB();
  const Tenant = TenantModel(masterConn);
  const tenant = await Tenant.findOne({ tenantId });

  if (!tenant || tenant.status !== 'active') {
    throw new Error('Tenant not found or inactive');
  }

  return tenant;
}

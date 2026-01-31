import { connectMasterDB } from '@/lib/db/master';
import { TenantModel } from '@/models/master/Tenant';

export async function resolveTenant(request) {
  const tenantSlug = request.headers.get('x-tenant');

  if (!tenantSlug) {
    throw new Error('x-tenant header is required');
  }

  const masterConn = await connectMasterDB();
  const Tenant = TenantModel(masterConn);

  const tenant = await Tenant.findOne({ slug: tenantSlug });

  if (!tenant || tenant.status !== 'active') {
    throw new Error('Tenant not found or inactive');
  }

  return tenant;
}

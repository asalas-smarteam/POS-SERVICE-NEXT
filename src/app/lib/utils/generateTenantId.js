import { connectMasterDB } from '@/lib/db/master';
import { TenantModel } from '@/models/master/Tenant';

function generateRandomTenantId() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

export async function generateUniqueTenantId() {
  const masterConn = await connectMasterDB();
  const Tenant = TenantModel(masterConn);

  while (true) {
    const tenantId = generateRandomTenantId();
    const existingTenant = await Tenant.findOne({ tenantId }).lean();

    if (!existingTenant) {
      return tenantId;
    }
  }
}

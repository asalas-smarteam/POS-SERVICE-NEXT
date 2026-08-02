import { NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantModel } from '@/models/master/Tenant';
import { UserModel } from '@/models/tenant/User';
import { resolveFeatures } from '@/lib/features/featureRegistry';

function sortBySedeIndex(a, b) {
  const ai = Number.isFinite(a.sedeIndex) ? a.sedeIndex : Number.MAX_SAFE_INTEGER;
  const bi = Number.isFinite(b.sedeIndex) ? b.sedeIndex : Number.MAX_SAFE_INTEGER;
  return ai - bi;
}

// Lista las sedes de la empresa del dueño (plano de control) con su conteo de
// usuarios. Solo accesible con token de dueño.
export async function GET(req) {
  try {
    const { companyId } = await getOwnerContext(req);

    const masterConn = await connectMasterDB();
    const Tenant = TenantModel(masterConn);

    const sedes = (
      await Tenant.find({ companyId, status: 'active' }).lean()
    ).sort(sortBySedeIndex);

    const result = [];
    for (const sede of sedes) {
      let userCount = 0;
      try {
        const conn = await getTenantConnection(sede.dbName);
        userCount = await UserModel(conn).countDocuments({});
      } catch (err) {
        console.error(`Failed to count users for ${sede.dbName}`, err);
      }
      result.push({
        tenantId: sede.tenantId,
        name: sede.name,
        sedeLabel: sede.sedeLabel || null,
        sedeIndex: Number.isFinite(sede.sedeIndex) ? sede.sedeIndex : null,
        // El panel las usa para no ofrecer roles de un modulo no contratado.
        features: resolveFeatures(sede.features),
        userCount,
      });
    }

    return NextResponse.json({ sedes: result });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to load sedes' : error.message },
      { status }
    );
  }
}

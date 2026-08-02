import { NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantModel } from '@/models/master/Tenant';
import { RoleNavModel } from '@/models/tenant/RoleNav';
import { signToken } from '@/lib/auth/jwt';
import { setAuthCookie } from '@/lib/auth/cookie';
import { filterNavByFeatures } from '@/lib/auth/roles';
import { resolveFeatures } from '@/lib/features/featureRegistry';
import { defaultLocale } from '../../../../../i18n';

function sortBySedeIndex(a, b) {
  const ai = Number.isFinite(a.sedeIndex) ? a.sedeIndex : Number.MAX_SAFE_INTEGER;
  const bi = Number.isFinite(b.sedeIndex) ? b.sedeIndex : Number.MAX_SAFE_INTEGER;
  return ai - bi;
}

function toSedeSummary(tenant) {
  return {
    tenantId: tenant.tenantId,
    name: tenant.name,
    sedeLabel: tenant.sedeLabel || null,
    sedeIndex: Number.isFinite(tenant.sedeIndex) ? tenant.sedeIndex : null,
  };
}

// Solo el dueño cambia de contexto: entra a una sede de su empresa (token
// dueño-en-sede con rol admin) o vuelve al panel (token dueño sin sede).
export async function POST(req) {
  try {
    const { owner, ownerId, companyId } = await getOwnerContext(req);

    const body = await req.json().catch(() => ({}));
    const rawTenantId = body?.tenantId;

    const masterConn = await connectMasterDB();
    const Tenant = TenantModel(masterConn);

    const availableSedes = (
      await Tenant.find({ companyId, status: 'active' }).lean()
    )
      .sort(sortBySedeIndex)
      .map(toSedeSummary);

    // Sin tenantId => volver al panel administrativo.
    if (!rawTenantId) {
      const token = await signToken({
        kind: 'owner',
        companyId,
        ownerId,
        role: 'owner',
        email: owner.email,
      });

      const response = NextResponse.json({
        success: true,
        kind: 'owner',
        companyId,
        tenantId: null,
        token,
        user: {
          id: ownerId,
          username: owner.email,
          email: owner.email,
          name: owner.name || '',
          role: 'OWNER',
          language: defaultLocale,
        },
        availableSedes,
        features: [],
        navMain: [],
      });

      setAuthCookie(response, token);
      return response;
    }

    const targetTenantId = String(rawTenantId);
    const target = await Tenant.findOne({
      tenantId: targetTenantId,
      status: 'active',
    }).lean();

    if (!target || String(target.companyId) !== companyId) {
      return NextResponse.json({ error: 'Sede not available' }, { status: 403 });
    }

    const features = resolveFeatures(target.features);

    const token = await signToken({
      kind: 'owner',
      companyId,
      ownerId,
      tenantId: String(target.tenantId),
      role: 'admin',
      email: owner.email,
      features,
    });

    // El dueño opera la sede como ADMIN: nav admin sembrado en cada sede.
    const tenantConn = await getTenantConnection(target.dbName);
    const RoleNav = RoleNavModel(tenantConn);
    const roleNav = await RoleNav.findOne({ role: 'ADMIN' }).lean();

    const response = NextResponse.json({
      success: true,
      kind: 'owner',
      companyId,
      tenantId: target.tenantId,
      token,
      user: {
        id: ownerId,
        username: owner.email,
        email: owner.email,
        name: owner.name || '',
        role: 'ADMIN',
        language: defaultLocale,
      },
      tenant: {
        tenantId: target.tenantId,
        name: target.name,
        sedeLabel: target.sedeLabel || null,
      },
      availableSedes,
      features,
      navMain: filterNavByFeatures(roleNav?.navItems, features),
    });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to switch sede' : error.message },
      { status }
    );
  }
}

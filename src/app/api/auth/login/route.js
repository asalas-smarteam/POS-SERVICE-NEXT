import { NextResponse } from 'next/server';
import { connectMasterDB } from '@/lib/db/master';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantModel } from '@/models/master/Tenant';
import { CompanyModel } from '@/models/master/Company';
import { CompanyUserModel } from '@/models/master/CompanyUser';
import { UserIndexModel } from '@/models/master/UserIndex';
import { UserModel } from '@/models/tenant/User';
import { RoleNavModel } from '@/models/tenant/RoleNav';
import { comparePassword } from '@/lib/auth/hash';
import { signToken } from '@/lib/auth/jwt';
import { setAuthCookie } from '@/lib/auth/cookie';
import { filterNavByFeatures } from '@/lib/auth/roles';
import { resolveFeatures } from '@/lib/features/featureRegistry';
import { normalizeEmail } from '@/lib/utils/normalizeEmail';
import { hashEmail } from '@/lib/utils/hashEmail';
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

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = normalizeEmail(email);
    const emailHash = hashEmail(normalizedEmail);

    const masterConn = await connectMasterDB();
    const CompanyUser = CompanyUserModel(masterConn);
    const Company = CompanyModel(masterConn);
    const UserIndex = UserIndexModel(masterConn);
    const Tenant = TenantModel(masterConn);

    // ---- 1) Plano de control: login del dueño (identidad unica en master) ----
    const owner = await CompanyUser.findOne({ emailHash }).lean();
    if (owner) {
      if (owner.isActive === false) {
        return NextResponse.json({ error: 'Account is inactive' }, { status: 403 });
      }

      const valid = await comparePassword(password, owner.passwordHash);
      if (!valid) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const company = await Company.findOne({ companyId: owner.companyId }).lean();
      if (!company || company.status !== 'active') {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }

      const availableSedes = (
        await Tenant.find({ companyId: owner.companyId, status: 'active' }).lean()
      )
        .sort(sortBySedeIndex)
        .map(toSedeSummary);

      const token = await signToken({
        kind: 'owner',
        companyId: String(owner.companyId),
        ownerId: String(owner._id),
        role: 'owner',
        email: owner.email,
      });

      const response = NextResponse.json({
        success: true,
        kind: 'owner',
        companyId: String(owner.companyId),
        token,
        user: {
          id: String(owner._id),
          username: owner.email,
          email: owner.email,
          name: owner.name || '',
          role: 'OWNER',
          language: defaultLocale,
        },
        company: { companyId: String(company.companyId), name: company.name },
        availableSedes,
        // El dueño en el panel no esta dentro de ninguna sede todavia; los
        // features llegan al entrar a una (switch-sede).
        features: [],
        navMain: [],
      });

      setAuthCookie(response, token);
      return response;
    }

    // ---- 2) Plano de datos: login de staff (una sola sede) ----
    const matches = await UserIndex.find({ emailHash }).lean();
    if (matches.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const tenantIds = matches.map((m) => m.tenantId);
    const activeTenants = await Tenant.find({
      tenantId: { $in: tenantIds },
      status: 'active',
    }).lean();

    if (activeTenants.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    // Tras el modelo de dos planos cada staff tiene exactamente una sede. Mas de
    // una coincidencia es una ambiguedad real (dato legado) y se rechaza.
    if (activeTenants.length > 1) {
      return NextResponse.json({ error: 'Multiple accounts detected' }, { status: 400 });
    }

    const tenant = activeTenants[0];
    const tenantConn = await getTenantConnection(tenant.dbName);
    const User = UserModel(tenantConn);
    const RoleNav = RoleNavModel(tenantConn);

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await comparePassword(password, user.passwordHash || user.password);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (user.isActive === false) {
      return NextResponse.json({ error: 'User account is inactive' }, { status: 403 });
    }

    const roleNav = await RoleNav.findOne({ role: user.role }).lean();
    const features = resolveFeatures(tenant.features);

    const token = await signToken({
      userId: String(user._id),
      tenantId: String(tenant.tenantId),
      role: String(user.role).toLowerCase(),
      companyId: tenant.companyId ? String(tenant.companyId) : null,
      // Copia para el middleware, que corre en edge y no puede leer la DB.
      // La autoridad sigue siendo Tenant.features, revalidado en cada endpoint.
      features,
    });

    const response = NextResponse.json({
      success: true,
      kind: 'staff',
      tenantId: tenant.tenantId,
      companyId: tenant.companyId ? String(tenant.companyId) : null,
      token,
      user: {
        id: String(user._id),
        username: user.username,
        email: user.email,
        role: user.role,
        language: user.language || defaultLocale,
      },
      tenant: {
        tenantId: tenant.tenantId,
        name: tenant.name,
        sedeLabel: tenant.sedeLabel || null,
      },
      availableSedes: [],
      features,
      navMain: filterNavByFeatures(roleNav?.navItems, features),
    });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { connectMasterDB } from '@/lib/db/master';
import { TenantModel } from '@/models/master/Tenant';
import { UserIndexModel } from '@/models/master/UserIndex';
import { UserModel } from '@/models/tenant/User';
import { getTenantConnection } from '@/lib/db/connections';
import { seedTenantDB } from '@/lib/tenant/seedTenant';
import { ensureDefaultPlans } from '@/lib/master/plans';
import { generateUniqueTenantId } from '@/lib/utils/generateTenantId';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeInternalDomain(name) {
  const normalizedBase = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');

  return `${normalizedBase || 'tenant'}.internal`;
}

function buildEmailHash(email) {
  return crypto
    .createHash('sha256')
    .update(email)
    .digest('hex');
}

export async function POST(req) {
  try {
    const body = await req.json();

    const name = body?.name?.toString()?.trim();
    const plan = body?.plan?.toString()?.trim();
    const adminEmail = body?.adminEmail?.toString()?.trim().toLowerCase();
    const adminPassword = body?.adminPassword?.toString() || '';

    if (!name || !plan || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'name, plan, adminEmail and adminPassword are required' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(adminEmail)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    if (adminPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    const masterConn = await connectMasterDB();
    const Tenant = TenantModel(masterConn);
    const UserIndex = UserIndexModel(masterConn);
    const Plan = await ensureDefaultPlans(masterConn);

    const activePlan = await Plan.findOne({ slug: plan, isActive: true });
    if (!activePlan) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      );
    }

    const existingTenantByName = await Tenant.findOne({
      name: { $regex: `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    });

    if (existingTenantByName) {
      return NextResponse.json(
        { error: 'Tenant name already exists' },
        { status: 409 }
      );
    }

    const existingUserIndex = await UserIndex.findOne({ emailHash: buildEmailHash(adminEmail) });
    if (existingUserIndex) {
      return NextResponse.json(
        { error: 'Admin email already belongs to another tenant' },
        { status: 409 }
      );
    }

    const tenantId = await generateUniqueTenantId();
    const dbName = `tenant_${tenantId}`;
    const internalDomain = normalizeInternalDomain(name);

    const tenant = await Tenant.create({
      tenantId,
      name,
      dbName,
      plan,
      internalDomain,
      status: 'active',
    });

    const tenantConn = await getTenantConnection(dbName);
    const User = UserModel(tenantConn);

    const passwordHash = await bcrypt.hash(adminPassword, 10);

    await User.create({
      username: adminEmail,
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      isActive: true,
    });

    await UserIndex.create({
      emailHash: buildEmailHash(adminEmail),
      tenantId,
    });

    await seedTenantDB(tenantConn);

    return NextResponse.json({
      ok: true,
      tenant,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message || 'Failed to register tenant' },
      { status: 500 }
    );
  }
}

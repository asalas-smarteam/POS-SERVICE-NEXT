import { NextResponse } from 'next/server';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { getTenantConnection } from '@/lib/db/connections';
import { UserIndexModel } from '@/models/master/UserIndex';
import { UserModel } from '@/models/tenant/User';
import { hashPassword } from '@/lib/auth/hash';
import { hashEmail } from '@/lib/utils/hashEmail';
import { normalizeEmail } from '@/lib/utils/normalizeEmail';
import { isEmailTaken } from '@/lib/master/emailUniqueness';
import { getAssignableRoles } from '@/lib/auth/roles';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function GET(req, { params }) {
  try {
    const { tenantId } = await params;
    const { sede } = await requireOwnerSede(req, tenantId);

    const conn = await getTenantConnection(sede.dbName);
    const User = UserModel(conn);
    const users = await User.find({})
      .select('username email role isActive createdAt updatedAt')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      tenant: { tenantId: sede.tenantId, name: sede.name, sedeLabel: sede.sedeLabel || null },
      users,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to load users' : error.message },
      { status }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const { tenantId } = await params;
    const { companyId, masterConn, sede } = await requireOwnerSede(req, tenantId);

    const body = await req.json();
    const username = String(body?.username || '').trim();
    const rawEmail = normalizeEmail(body?.email || '');
    const password = String(body?.password || '');
    const role = String(body?.role || '');

    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }
    if (!rawEmail) {
      return NextResponse.json({ error: 'Email is required.' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }
    if (!getAssignableRoles(sede.features).includes(role)) {
      return NextResponse.json({ error: 'Invalid role value.' }, { status: 400 });
    }
    if (!sede.internalDomain) {
      return NextResponse.json({ error: 'Tenant configuration is invalid.' }, { status: 400 });
    }

    const email = rawEmail.includes('@')
      ? rawEmail
      : `${rawEmail}@${normalizeEmail(sede.internalDomain)}`;

    if (!EMAIL_REGEX.test(email)) {
      return NextResponse.json({ error: 'Invalid email format.' }, { status: 400 });
    }

    // Email unico across dueños (CompanyUser) y staff de cualquier sede (UserIndex).
    if (await isEmailTaken(masterConn, email)) {
      return NextResponse.json({ error: 'Email already exists.' }, { status: 409 });
    }

    const conn = await getTenantConnection(sede.dbName);
    const User = UserModel(conn);

    const exists = await User.findOne({ $or: [{ username }, { email }] });
    if (exists) {
      return NextResponse.json({ error: 'Username or email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      username,
      email,
      passwordHash,
      role,
      isActive: true,
    });

    const emailHash = hashEmail(email);
    const UserIndex = UserIndexModel(masterConn);
    await UserIndex.updateOne(
      { emailHash, tenantId: sede.tenantId },
      { $set: { emailHash, tenantId: sede.tenantId, companyId } },
      { upsert: true }
    );

    return NextResponse.json(
      {
        _id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to create user' : error.message },
      { status }
    );
  }
}

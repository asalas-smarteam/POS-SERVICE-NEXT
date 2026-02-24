import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { connectMasterDB } from '@/lib/db/master';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantModel } from '@/models/master/Tenant';
import { UserIndexModel } from '@/models/master/UserIndex';
import { UserModel } from '@/models/tenant/User';
import { comparePassword } from '@/lib/auth/hash';
import { signToken } from '@/lib/auth/jwt';
import { setAuthCookie } from '@/lib/auth/cookie';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailHash = crypto
      .createHash('sha256')
      .update(normalizedEmail)
      .digest('hex');

    const masterConn = await connectMasterDB();
    const UserIndex = UserIndexModel(masterConn);
    const Tenant = TenantModel(masterConn);

    const matches = await UserIndex.find({ emailHash }).lean();

    if (matches.length === 0) {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    if (matches.length > 1) {
      return NextResponse.json({ error: 'Multiple accounts detected' }, { status: 400 });
    }

    const tenantId = matches[0].tenantId;
    const tenant = await Tenant.findOne({ tenantId }).lean();

    if (!tenant || tenant.status !== 'active') {
      return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const tenantConn = await getTenantConnection(tenant.dbName);
    const User = UserModel(tenantConn);

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

    const token = signToken({
      userId: user._id,
      tenantId: tenant.tenantId,
      role: user.role,
    });

    const response = NextResponse.json({
      success: true,
      tenantId: tenant.tenantId,
    });

    setAuthCookie(response, token);
    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 500 }
    );
  }
}

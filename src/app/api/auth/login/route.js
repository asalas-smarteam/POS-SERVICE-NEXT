import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { UserModel } from '@/models/tenant/User';
import { comparePassword } from '@/lib/auth/hash';
import { signToken } from '@/lib/auth/jwt';
import { getRoleNav } from '@/lib/auth/roles';

export async function POST(req) {
  try {
    const { email, username, password } = await req.json();
    const identifier = username || email;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: 'username/email and password required' },
        { status: 400 }
      );
    }

    const tenant = await resolveTenant(req);
    const tenantConn = await getTenantConnection(tenant.dbName);
    const User = UserModel(tenantConn);

    const user = await User.findOne({
      $or: [{ username: identifier }, { email: identifier }],
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    if (user.isActive === false) {
      return NextResponse.json(
        { error: 'User is inactive. Contact an administrator.' },
        { status: 403 }
      );
    }

    const passwordToCompare = user.passwordHash || user.password;
    const valid = await comparePassword(password, passwordToCompare);

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const token = signToken({
      userId: user._id,
      role: user.role,
      tenant: tenant.slug,
    });

    const navMain = getRoleNav(user.role);
    const resolvedName = user.name ?? user.username ?? user.email;
    const resolvedAvatar = user.avatar ?? tenant.logo ?? null;

    return NextResponse.json({
      token,
      user: {
        id: String(user._id),
        name: resolvedName,
        email: user.email ?? user.username,
        avatar: resolvedAvatar,
        role: user.role,
        username: user.username,
      },
      navMain,
      tenant: {
        slug: tenant.slug,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { UserModel } from '@/models/tenant/User';
import { comparePassword } from '@/lib/auth/hash';
import { signToken } from '@/lib/auth/jwt';

export async function POST(req) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'email and password required' },
        { status: 400 }
      );
    }

    // Resolver tenant
    const tenant = await resolveTenant(req);

    // Conectar DB tenant
    const tenantConn = await getTenantConnection(tenant.dbName);
    const User = UserModel(tenantConn);

    // Buscar usuario
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Verificar password
    const valid = await comparePassword(password, user.password);

    if (!valid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Firmar JWT
    const token = signToken({
      userId: user._id,
      role: user.role,
      tenant: tenant.slug,
    });

    return NextResponse.json({
      token,
      user: {
        email: user.email,
        role: user.role,
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

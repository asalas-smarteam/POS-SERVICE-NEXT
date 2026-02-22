import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/hash';
import { ROLE_VALUES } from '@/lib/auth/roles';
import { getAuthContext, requireAdmin } from '@/lib/auth/requestAuth';

export async function GET(req) {
  try {
    const { User, authUser } = await getAuthContext(req);
    requireAdmin(authUser);

    const users = await User.find()
      .select('username role isActive createdAt updatedAt')
      .sort({ createdAt: -1 });

    return NextResponse.json(users);
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

export async function POST(req) {
  try {
    const { User, authUser } = await getAuthContext(req);
    requireAdmin(authUser);

    const body = await req.json();
    const username = String(body?.username || '').trim();
    const password = String(body?.password || '');
    const role = String(body?.role || '');

    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    if (!ROLE_VALUES.includes(role)) {
      return NextResponse.json({ error: 'Invalid role value.' }, { status: 400 });
    }

    const exists = await User.findOne({ username });
    if (exists) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      username,
      passwordHash,
      role,
      isActive: true,
    });

    return NextResponse.json(
      {
        _id: user._id,
        username: user.username,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
      { status: 201 }
    );
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

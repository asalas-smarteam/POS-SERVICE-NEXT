import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/hash';
import { ROLE_VALUES } from '@/lib/auth/roles';
import { getAuthContext, requireAdmin } from '@/lib/auth/requestAuth';

export async function GET(req) {
  try {
    const { User, authUser } = await getAuthContext(req);
    requireAdmin(authUser);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, Number(searchParams.get('page') || 1));
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') || 10)));
    const search = String(searchParams.get('search') || '').trim();
    const status = String(searchParams.get('status') || 'all').toLowerCase();

    const query = {};

    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    if (search) {
      const regex = new RegExp(search, 'i');
      query.$or = [{ username: regex }, { email: regex }, { role: regex }];
    }

    const total = await User.countDocuments(query);
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const normalizedPage = Math.min(page, totalPages);

    const users = await User.find(query)
      .select('username email role isActive createdAt updatedAt')
      .sort({ createdAt: -1 })
      .skip((normalizedPage - 1) * limit)
      .limit(limit);

    return NextResponse.json({
      users,
      total,
      totalPages,
      page: normalizedPage,
    });
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
    const email = String(body?.email || '').trim();
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

    const exists = await User.findOne({
      $or: [{ username }, ...(email ? [{ email }] : [])],
    });
    if (exists) {
      return NextResponse.json({ error: 'Username or email already exists.' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const user = await User.create({
      username,
      ...(email ? { email } : {}),
      passwordHash,
      role,
      isActive: true,
    });

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
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

import { NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth/jwt';

export async function GET(req) {
  try {
    const auth = req.headers.get('authorization');

    if (!auth) {
      return NextResponse.json(
        { error: 'No token provided' },
        { status: 401 }
      );
    }

    const token = auth.replace('Bearer ', '');
    const payload = verifyToken(token);

    return NextResponse.json({
      userId: payload.userId,
      role: payload.role,
      tenant: payload.tenant,
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
}

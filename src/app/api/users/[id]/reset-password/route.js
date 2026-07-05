import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/auth/hash';
import { getAuthContext, requireAdmin } from '@/lib/auth/requestAuth';

export async function PATCH(req, { params }) {
  try {
    const { User, authUser } = await getAuthContext(req);
    requireAdmin(authUser);

    const { id } = await params;
    const body = await req.json();
    const newPassword = String(body?.newPassword || '');

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters.' }, { status: 400 });
    }

    const passwordHash = await hashPassword(newPassword);
    const updated = await User.findByIdAndUpdate(
      id,
      { passwordHash, updatedAt: new Date() },
      { new: true }
    ).select('username role isActive createdAt updatedAt');

    if (!updated) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

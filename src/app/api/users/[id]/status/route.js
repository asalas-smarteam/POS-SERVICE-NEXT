import { NextResponse } from 'next/server';
import { getAuthContext, requireAdmin } from '@/lib/auth/requestAuth';

export async function PATCH(req, { params }) {
  try {
    const { User, authUser } = await getAuthContext(req);
    requireAdmin(authUser);

    const { id } = await params;
    const body = await req.json();

    if (typeof body?.isActive !== 'boolean') {
      return NextResponse.json({ error: 'isActive must be boolean.' }, { status: 400 });
    }

    if (String(authUser._id) === id && body.isActive === false) {
      return NextResponse.json({ error: 'You cannot deactivate your own user.' }, { status: 400 });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (targetUser.role === 'ADMIN' && body.isActive === false) {
      const activeAdmins = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (activeAdmins <= 1) {
        return NextResponse.json({ error: 'Cannot deactivate the last active ADMIN.' }, { status: 400 });
      }
    }

    targetUser.isActive = body.isActive;
    targetUser.updatedAt = new Date();
    await targetUser.save();

    return NextResponse.json({
      _id: targetUser._id,
      username: targetUser.username,
      role: targetUser.role,
      isActive: targetUser.isActive,
      createdAt: targetUser.createdAt,
      updatedAt: targetUser.updatedAt,
    });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

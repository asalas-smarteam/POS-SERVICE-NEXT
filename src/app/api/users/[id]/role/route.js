import { NextResponse } from 'next/server';
import { getAssignableRoles } from '@/lib/auth/roles';
import { getAuthContext, requireAdmin } from '@/lib/auth/requestAuth';

export async function PATCH(req, { params }) {
  try {
    const { User, authUser, tenant } = await getAuthContext(req);
    requireAdmin(authUser);

    const { id } = await params;
    const body = await req.json();
    const role = String(body?.role || '');

    if (!getAssignableRoles(tenant?.features).includes(role)) {
      return NextResponse.json({ error: 'Invalid role value.' }, { status: 400 });
    }

    const targetUser = await User.findById(id);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found.' }, { status: 404 });
    }

    if (String(authUser._id) === id && role !== 'ADMIN') {
      return NextResponse.json({ error: 'You cannot remove your own ADMIN role.' }, { status: 400 });
    }

    if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
      const activeAdmins = await User.countDocuments({ role: 'ADMIN', isActive: true });
      if (targetUser.isActive && activeAdmins <= 1) {
        return NextResponse.json({ error: 'Cannot demote the last active ADMIN.' }, { status: 400 });
      }
    }

    targetUser.role = role;
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

import { NextResponse } from 'next/server';
import { getAuthContext, requireAdmin } from '@/lib/auth/requestAuth';

export async function GET(req) {
  try {
    const { User, authUser } = await getAuthContext(req);
    requireAdmin(authUser);

    const [totalUsers, activeUsers, distinctRoles, lastCreatedUser] = await Promise.all([
      User.countDocuments({}),
      User.countDocuments({ isActive: true }),
      User.distinct('role'),
      User.findOne({}).sort({ createdAt: -1 }).select('createdAt'),
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      rolesCount: distinctRoles.length,
      lastCreatedUserDate: lastCreatedUser?.createdAt || null,
    });
  } catch (error) {
    const status = error.status || 500;
    return NextResponse.json({ error: error.message }, { status });
  }
}

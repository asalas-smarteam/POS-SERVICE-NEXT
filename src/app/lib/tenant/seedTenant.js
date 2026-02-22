import { RoleNavModel } from '@/models/tenant/RoleNav';
import { UserModel } from '@/models/tenant/User';
import { hashPassword } from '@/lib/auth/hash';
import { ensureDefaultSettings } from '@/lib/tenant/settingsDefaults';
import { NAV_BY_ROLE } from '@/lib/auth/roles';

export async function seedTenantDB(conn, adminUser) {
  const RoleNav = RoleNavModel(conn);
  const User = UserModel(conn);

  for (const [role, navItems] of Object.entries(NAV_BY_ROLE)) {
    await RoleNav.updateOne(
      { role },
      { role, navItems },
      { upsert: true }
    );
  }

  const existingAdminUser = await User.findOne({ username: adminUser.username });
  if (existingAdminUser) {
    throw new Error('Admin username already exists in this tenant');
  }

  const passwordHash = await hashPassword(adminUser.password);
  await User.create({
    username: adminUser.username,
    passwordHash,
    role: 'ADMIN',
    isActive: true,
  });

  await ensureDefaultSettings(conn);

  console.log('🌱 Secure seed completed for tenant with ADMIN bootstrap user');
}

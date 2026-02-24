import { RoleNavModel } from '@/models/tenant/RoleNav';
import { ensureDefaultSettings } from '@/lib/tenant/settingsDefaults';
import { ensureDefaultProductSize } from '@/lib/setup/ensureDefaultProductSize';
import { NAV_BY_ROLE } from '@/lib/auth/roles';

export async function seedTenantDB(conn) {
  const RoleNav = RoleNavModel(conn);

  for (const [role, navItems] of Object.entries(NAV_BY_ROLE)) {
    await RoleNav.updateOne(
      { role },
      { role, navItems },
      { upsert: true }
    );
  }

  await ensureDefaultSettings(conn);
  await ensureDefaultProductSize(conn);

  console.log('🌱 Tenant defaults seeded successfully');
}

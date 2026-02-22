import { RoleNavModel } from '@/models/tenant/RoleNav';
import { UserModel } from '@/models/tenant/User';
import { hashPassword } from '@/lib/auth/hash';
import { ensureDefaultSettings } from '@/lib/tenant/settingsDefaults';

export async function seedTenantDB(conn, adminUser) {
  const RoleNav = RoleNavModel(conn);
  const User = UserModel(conn);

  const navIconMap = {
    dashboard: 'home',
    sales: 'cash-register',
    orders: 'receipt-2',
    products: 'package',
    ingredients: 'salt',
    users: 'users',
    reports: 'chart-bar',
    kitchen: 'chef-hat',
    settings: 'settings',
  };
  const adminNavItems = [
    { label: 'Home', href: '/home', icon: navIconMap.dashboard },
    { label: 'Orders', href: '/orders', icon: navIconMap.sales },
    { label: 'Products', href: '/products', icon: navIconMap.products },
    { label: 'Ingredients', href: '/ingredients', icon: navIconMap.ingredients },
    { label: 'Settings', href: '/settings', icon: navIconMap.settings },
    { label: 'Kitchen', href: '/kitchen', icon: navIconMap.kitchen },
    { label: 'Users', href: '/users', icon: navIconMap.users },
  ];

  await RoleNav.updateOne(
    { role: 'ADMIN' },
    { role: 'ADMIN', navItems: adminNavItems },
    { upsert: true }
  );

  const existingAdminUser = await User.findOne({ username: adminUser.username });
  if (existingAdminUser) {
    throw new Error('Admin username already exists in this tenant');
  }

  const passwordHash = await hashPassword(adminUser.password);
  await User.create({
    username: adminUser.username,
    passwordHash,
    role: 'ADMIN',
  });

  await ensureDefaultSettings(conn);

  console.log('🌱 Secure seed completed for tenant with ADMIN bootstrap user');
}

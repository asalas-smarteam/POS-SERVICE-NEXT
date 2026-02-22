import { RoleModel } from '@/models/tenant/Role';
import { RoleNavModel } from '@/models/tenant/RoleNav';
import { UserModel } from '@/models/tenant/User';
import { hashPassword } from '@/lib/auth/hash';
import { ensureDefaultSettings } from '@/lib/tenant/settingsDefaults';

export async function seedTenantDB(conn, tenantSlug) {
  const Role = RoleModel(conn);
  const RoleNav = RoleNavModel(conn);
  const User = UserModel(conn);

  const roles = ['ADMIN', 'CASHIER', 'KITCHEN'];
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
  const roleNavDefaults = {
    ADMIN: [
      { label: 'Home', href: '/home', icon: navIconMap.dashboard },
      { label: 'Orders', href: '/orders', icon: navIconMap.sales },
      { label: 'Products', href: '/products', icon: navIconMap.products },
      { label: 'Ingredients', href: '/ingredients', icon: navIconMap.ingredients },
      { label: 'Settings', href: '/settings', icon: navIconMap.settings },
      { label: 'Kitchen', href: '/kitchen', icon: navIconMap.kitchen },
    ],
    CASHIER: [
      { label: 'Orders', href: '/orders', icon: navIconMap.sales },
    ],
    KITCHEN: [
      { label: 'Kitchen', href: '/kitchen', icon: navIconMap.kitchen },
    ],
  };

  for (const role of roles) {
    await Role.updateOne(
      { name: role },
      { name: role },
      { upsert: true }
    );
  }
  for (const role of roles) {
    await RoleNav.updateOne(
      { role },
      { role, navItems: roleNavDefaults[role] },
      { upsert: true }
    );
  }

  const users = [
    {
      email: `admin@${tenantSlug}.com`,
      password: await hashPassword('admin123'),
      role: 'ADMIN',
    },
    {
      email: `cashier@${tenantSlug}.com`,
      password: await hashPassword('cashier123'),
      role: 'CASHIER',
    },
    {
      email: `kitchen@${tenantSlug}.com`,
      password: await hashPassword('kitchen123'),
      role: 'KITCHEN',
    },
  ];

  for (const user of users) {
    await User.updateOne(
      { email: user.email },
      user,
      { upsert: true }
    );
  }

  await ensureDefaultSettings(conn);

  console.log(`🌱 Secure seed completed for tenant: ${tenantSlug}`);
}

import { RoleModel } from '@/models/tenant/Role';
import { RoleNavModel } from '@/models/tenant/RoleNav';
import { UserModel } from '@/models/tenant/User';
import { hashPassword } from '@/lib/auth/hash';
import { ensureDefaultSettings } from '@/lib/tenant/settingsDefaults';

export async function seedTenantDB(conn, tenantSlug) {
  const Role = RoleModel(conn);
  const RoleNav = RoleNavModel(conn);
  const User = UserModel(conn);

  const roles = ['ADMIN', 'CAJERO', 'COCINA'];
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
      { label: 'Dashboard', href: '/dashboard', icon: navIconMap.dashboard },
      { label: 'Ventas', href: '/ventas', icon: navIconMap.sales },
      { label: 'Órdenes', href: '/ordenes', icon: navIconMap.orders },
      { label: 'Productos', href: '/productos', icon: navIconMap.products },
      { label: 'Ingredientes', href: '/ingredientes', icon: navIconMap.ingredients },
      { label: 'Usuarios', href: '/usuarios', icon: navIconMap.users },
      { label: 'Reportes', href: '/reportes', icon: navIconMap.reports },
      { label: 'Configuración', href: '/configuracion', icon: navIconMap.settings },
    ],
    CAJERO: [
      { label: 'Dashboard', href: '/dashboard', icon: navIconMap.dashboard },
      { label: 'Ventas', href: '/ventas', icon: navIconMap.sales },
      { label: 'Órdenes', href: '/ordenes', icon: navIconMap.orders },
    ],
    COCINA: [
      { label: 'Dashboard', href: '/dashboard', icon: navIconMap.dashboard },
      { label: 'Órdenes', href: '/ordenes', icon: navIconMap.orders },
      { label: 'Cocina', href: '/kitchen', icon: navIconMap.kitchen },
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
      email: `cajero@${tenantSlug}.com`,
      password: await hashPassword('cajero123'),
      role: 'CAJERO',
    },
    {
      email: `cocina@${tenantSlug}.com`,
      password: await hashPassword('cocina123'),
      role: 'COCINA',
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

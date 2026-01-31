import { RoleModel } from '@/models/tenant/Role';
import { UserModel } from '@/models/tenant/User';
import { hashPassword } from '@/lib/auth/hash';

export async function seedTenantDB(conn, tenantSlug) {
  const Role = RoleModel(conn);
  const User = UserModel(conn);

  const roles = ['ADMIN', 'CAJERO', 'COCINA'];

  for (const role of roles) {
    await Role.updateOne(
      { name: role },
      { name: role },
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

  console.log(`🌱 Secure seed completed for tenant: ${tenantSlug}`);
}

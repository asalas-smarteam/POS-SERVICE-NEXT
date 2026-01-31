import { NextResponse } from 'next/server';
import { connectMasterDB } from '@/lib/db/master';
import { TenantModel } from '@/models/master/Tenant';
import { getTenantConnection } from '@/lib/db/connections';
import { seedTenantDB } from '@/lib/tenant/seedTenant';

export async function POST(req) {
  try {
    const body = await req.json();
    const { name, slug, plan = 'basic' } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: 'name and slug are required' },
        { status: 400 }
      );
    }

    const masterConn = await connectMasterDB();
    const Tenant = TenantModel(masterConn);

    const exists = await Tenant.findOne({ slug });
    if (exists) {
      return NextResponse.json(
        { error: 'Tenant already exists' },
        { status: 400 }
      );
    }

    const dbName = `${slug}_pos_db`;

    // Crear tenant en MASTER
    const tenant = await Tenant.create({
      name,
      slug,
      dbName,
      plan,
    });

    // Crear conexión tenant DB
    const tenantConn = await getTenantConnection(dbName);

    // Seed automático
    await seedTenantDB(tenantConn, slug);

    return NextResponse.json({
      ok: true,
      tenant,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

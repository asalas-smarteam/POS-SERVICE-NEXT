import { NextResponse } from 'next/server';
import { connectMasterDB } from '@/lib/db/master';
import { TenantModel } from '@/models/master/Tenant';
import { getTenantConnection } from '@/lib/db/connections';
import { seedTenantDB } from '@/lib/tenant/seedTenant';

const SLUG_REGEX = /^[a-z0-9-]+$/;
const MIN_PASSWORD_LENGTH = 8;

export async function POST(req) {
  try {
    const contentType = req.headers.get('content-type') || '';
    const isJsonPayload = contentType.includes('application/json');

    let name;
    let slug;
    let plan;
    let logo = null;
    let adminUser;

    if (isJsonPayload) {
      const body = await req.json();
      name = body?.name?.toString()?.trim();
      slug = body?.slug?.toString()?.trim();
      plan = body?.plan?.toString()?.trim() || 'basic';
      adminUser = {
        username: body?.adminUser?.username?.toString()?.trim(),
        password: body?.adminUser?.password?.toString() || '',
      };
    } else {
      const formData = await req.formData();
      name = formData.get('name')?.toString()?.trim();
      slug = formData.get('slug')?.toString()?.trim();
      plan = formData.get('plan')?.toString()?.trim() || 'basic';
      logo = formData.get('logo');
      adminUser = {
        username: formData.get('username')?.toString()?.trim(),
        password: formData.get('password')?.toString() || '',
      };
    }

    if (!name || !slug || !adminUser?.username || !adminUser?.password) {
      return NextResponse.json(
        { error: 'name, slug and admin credentials are required' },
        { status: 400 }
      );
    }

    if (!SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { error: 'Invalid slug format' },
        { status: 400 }
      );
    }

    if (adminUser.password.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
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
    let logoPath = null;

    if (logo) {
      const logoName = typeof logo === 'string' ? logo : logo?.name || 'logo';
      logoPath = `/uploads/tenants/${slug}/${logoName}`;
      // TODO: Upload logo file to S3/Cloudinary and store its URL.
      // TODO: Replace local placeholder path with cloud URL once integrated.
    }

    const tenant = await Tenant.create({
      name,
      slug,
      dbName,
      plan,
      logo: logoPath,
    });

    const tenantConn = await getTenantConnection(dbName);
    await seedTenantDB(tenantConn, adminUser);

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

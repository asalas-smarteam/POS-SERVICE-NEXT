import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantSettingModel } from '@/models/tenant/TenantSetting';

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

export async function PUT(req, context) {
  try {
    const { id } = context.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const TenantSetting = TenantSettingModel(conn);

    const existing = await TenantSetting.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    const body = await req.json();
    if (!Object.prototype.hasOwnProperty.call(body, 'data')) {
      return NextResponse.json({ error: 'data is required' }, { status: 400 });
    }

    const nextData = body.data;
    if (!Array.isArray(nextData) && !isPlainObject(nextData)) {
      return NextResponse.json(
        { error: 'data must be an object or an array' },
        { status: 400 }
      );
    }

    if (Array.isArray(existing.data) && !Array.isArray(nextData)) {
      return NextResponse.json(
        { error: 'data must remain an array for this setting' },
        { status: 400 }
      );
    }

    if (isPlainObject(existing.data) && !isPlainObject(nextData)) {
      return NextResponse.json(
        { error: 'data must remain an object for this setting' },
        { status: 400 }
      );
    }

    existing.data = nextData;
    await existing.save();

    return NextResponse.json(existing);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import { ensureDefaultSettings } from '@/lib/tenant/settingsDefaults';

export async function GET(req) {
  try {
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const TenantSetting = TenantSettingModel(conn);

    let settings = await TenantSetting.find().sort({ createdAt: 1 });

    if (!settings.length) {
      settings = await ensureDefaultSettings(conn);
    }

    return NextResponse.json(settings);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

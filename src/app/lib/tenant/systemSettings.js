import { TenantSettingModel } from '@/models/tenant/TenantSetting';

export const SYSTEM_SETTINGS_DESCRIPTION = 'Settings';

const isPlainObject = (value) =>
  value && typeof value === 'object' && !Array.isArray(value);

export async function getSystemSettingsDocument(conn) {
  const TenantSetting = TenantSettingModel(conn);
  return TenantSetting.findOne({ description: SYSTEM_SETTINGS_DESCRIPTION }).lean();
}

export async function getSystemSettings(conn) {
  const settingsDocument = await getSystemSettingsDocument(conn);
  if (!isPlainObject(settingsDocument?.data)) {
    return {};
  }
  return settingsDocument.data;
}


import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import { normalizeMenuDocument } from '@/lib/menu/menuSchema';

export const MENU_SETTING_DESCRIPTION = 'Online Menu';

// Devuelve siempre un documento valido: una sede que nunca abrio el editor no
// tiene la fila, y el resto del codigo no deberia tener que saberlo.
export async function readMenuDocument(conn) {
  const TenantSetting = TenantSettingModel(conn);
  const row = await TenantSetting.findOne({
    description: MENU_SETTING_DESCRIPTION,
  }).lean();

  return normalizeMenuDocument(row?.data);
}

export async function writeMenuDocument(conn, document) {
  const TenantSetting = TenantSettingModel(conn);
  const normalized = normalizeMenuDocument(document);

  await TenantSetting.updateOne(
    { description: MENU_SETTING_DESCRIPTION },
    { $set: { data: normalized } },
    { upsert: true },
  );

  return normalized;
}

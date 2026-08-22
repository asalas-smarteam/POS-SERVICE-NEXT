import { TenantModel } from '@/models/master/Tenant';
import { MENU_SLUG_ERRORS, normalizeMenuSlug } from '@/lib/menu/menuSlug';

// Resolucion del link publico. Solo sedes activas: una sede dada de baja no
// debe seguir sirviendo su menu.
export async function findTenantByMenuSlug(masterConn, slug) {
  const normalized = normalizeMenuSlug(slug);
  if (!normalized) {
    return null;
  }

  const Tenant = TenantModel(masterConn);
  return Tenant.findOne({ menuSlug: normalized, status: 'active' }).lean();
}

export async function assignMenuSlug(masterConn, tenantId, slug) {
  const Tenant = TenantModel(masterConn);
  const normalized = normalizeMenuSlug(slug);

  try {
    await Tenant.updateOne(
      { tenantId: String(tenantId) },
      { $set: { menuSlug: normalized } },
    );
    return { ok: true };
  } catch (error) {
    // 11000 es la violacion del indice unico: el slug ya lo tiene otra sede.
    if (error?.code === 11000) {
      return { ok: false, error: MENU_SLUG_ERRORS.TAKEN };
    }
    throw error;
  }
}

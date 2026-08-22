import { TenantModel } from '@/models/master/Tenant';
import { MENU_SLUG_ERRORS, normalizeMenuSlug, validateMenuSlug } from '@/lib/menu/menuSlug';

// Resolucion del link publico. Solo sedes activas: una sede dada de baja no
// debe seguir sirviendo su menu.
//
// Se valida el formato antes de consultar: assignMenuSlug nunca guarda un
// slug que no pase validateMenuSlug, asi que uno mal formado (largo fuera de
// rango, mayusculas, caracteres invalidos) no puede coincidir con ningun
// documento. Esta es la unica ruta sin sesion de toda la app y no hay rate
// limiting en ningun lado: un slug que no puede matchear no deberia costar
// un viaje a la base solo para confirmarlo.
export async function findTenantByMenuSlug(masterConn, slug) {
  const normalized = normalizeMenuSlug(slug);
  if (!normalized || validateMenuSlug(normalized)) {
    return null;
  }

  const Tenant = TenantModel(masterConn);
  return Tenant.findOne({ menuSlug: normalized, status: 'active' }).lean();
}

export async function assignMenuSlug(masterConn, tenantId, slug) {
  const Tenant = TenantModel(masterConn);
  const normalized = normalizeMenuSlug(slug);

  // Rechazar slugs vacios: no persistir '' que seria indexado en unique.
  if (!normalized || normalized.length === 0) {
    return { ok: false, error: MENU_SLUG_ERRORS.INVALID };
  }

  try {
    const result = await Tenant.updateOne(
      { tenantId: String(tenantId) },
      { $set: { menuSlug: normalized } },
    );
    // Si matchedCount es 0, el tenantId no existe.
    if (result.matchedCount === 0) {
      return { ok: false, error: 'tenant_not_found' };
    }
    return { ok: true };
  } catch (error) {
    // 11000 es la violacion del indice unico: el slug ya lo tiene otra sede.
    if (error?.code === 11000) {
      return { ok: false, error: MENU_SLUG_ERRORS.TAKEN };
    }
    throw error;
  }
}

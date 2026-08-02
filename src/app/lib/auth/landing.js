import { moduleFromHref } from "@/lib/features/featureRegistry";
import { DEFAULT_MODULE_PER_ROLE } from "@/lib/security/rolePermissions";

/**
 * A que modulo mandar a alguien recien autenticado.
 *
 * No se puede hardcodear /dashboard: con un plan que no lo incluya el
 * middleware rebota el aterrizaje y el usuario nunca entra. Se elige el default
 * del rol solo si esta entre los modulos que el nav ya trae filtrados por plan,
 * y si no, el primero disponible.
 */
export function resolveLandingModule(navMain, role) {
  const modules = (Array.isArray(navMain) ? navMain : [])
    .map((item) => moduleFromHref(item?.href ?? item?.url ?? ""))
    .filter(Boolean);

  if (modules.length === 0) {
    return null;
  }

  const preferred = DEFAULT_MODULE_PER_ROLE[String(role || "").toLowerCase()];
  return preferred && modules.includes(preferred) ? preferred : modules[0];
}

export function resolveLandingPath({ locale, tenantId, navMain, role }) {
  const moduleName = resolveLandingModule(navMain, role);
  return moduleName && tenantId ? `/${locale}/${moduleName}/${tenantId}` : null;
}

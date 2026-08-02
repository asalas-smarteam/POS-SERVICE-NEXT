import { isProtectedModule, normalizePathWithoutLocale } from "./routeDefinitions";

const EMPTY_RESULT = {
  module: null,
  tenantId: null,
  segments: [],
};

export const resolveModuleFromPath = (pathname, locales = []) => {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return EMPTY_RESULT;
  }

  const normalizedPath = normalizePathWithoutLocale(pathname, locales);

  if (typeof normalizedPath !== "string" || normalizedPath.length === 0 || normalizedPath === "/") {
    return EMPTY_RESULT;
  }

  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments.length < 2) {
    return EMPTY_RESULT;
  }

  const [rawModule, rawTenantId] = segments;
  const moduleName = typeof rawModule === "string" ? rawModule.toLowerCase() : "";
  const tenantId = typeof rawTenantId === "string" && rawTenantId.length > 0 ? rawTenantId : null;

  if (!tenantId) {
    return EMPTY_RESULT;
  }

  return {
    module: isProtectedModule(moduleName) ? moduleName : null,
    tenantId,
    segments,
  };
};

// Detecta la ruta del panel administrativo del dueño: /{locale}/admin/{companyId}.
// Es company-scoped (no lleva tenantId), por eso se resuelve aparte del matcher
// de modulos de sede.
export const resolveAdminPanelFromPath = (pathname, locales = []) => {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return null;
  }

  const normalizedPath = normalizePathWithoutLocale(pathname, locales);

  if (typeof normalizedPath !== "string" || normalizedPath === "/") {
    return null;
  }

  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments[0]?.toLowerCase() !== "admin") {
    return null;
  }

  const companyId = segments[1];
  if (!companyId) {
    return null;
  }

  return { companyId, segments };
};

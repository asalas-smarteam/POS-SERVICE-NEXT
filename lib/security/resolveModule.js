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

import { ALL_FEATURE_KEYS } from "@/lib/features/featureRegistry";

// Cada feature del registro es una ruta protegida. Derivado en vez de escrito a
// mano: la lista manual habia perdido 'floor', que quedaba sin chequeo de rol
// ni de pertenencia de tenant en el middleware.
export const PROTECTED_MODULES = ALL_FEATURE_KEYS;

export const PUBLIC_ROUTE_PREFIXES = ["/login", "/register"];

const ALWAYS_PUBLIC_PREFIXES = ["/_next", "/api/public"];
const ALWAYS_PUBLIC_EXACT = ["/", "/favicon.ico"];
const LOCALE_SEGMENT_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;
const STATIC_ASSET_PATTERN = /\.[a-zA-Z0-9]+$/;

export const isProtectedModule = (moduleName = "") => {
  if (!moduleName) {
    return false;
  }

  return PROTECTED_MODULES.includes(String(moduleName).toLowerCase());
};

export const normalizePathWithoutLocale = (pathname = "/", locales = []) => {
  if (typeof pathname !== "string" || pathname.length === 0) {
    return "/";
  }

  const sanitizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  const [pathOnly] = sanitizedPath.split(/[?#]/);
  const segments = pathOnly.split("/").filter(Boolean);

  if (segments.length === 0) {
    return "/";
  }

  const [firstSegment, ...restSegments] = segments;
  const localeSet = new Set(
    Array.isArray(locales)
      ? locales
          .filter((locale) => typeof locale === "string" && locale.length > 0)
          .map((locale) => locale.toLowerCase())
      : []
  );

  const hasKnownLocalePrefix = localeSet.size > 0 && localeSet.has(firstSegment.toLowerCase());
  const hasLocaleLikePrefix = localeSet.size === 0 && LOCALE_SEGMENT_PATTERN.test(firstSegment);

  if (!hasKnownLocalePrefix && !hasLocaleLikePrefix) {
    return pathOnly || "/";
  }

  return restSegments.length > 0 ? `/${restSegments.join("/")}` : "/";
};

export const isPublicRoute = (pathname = "/", locales = []) => {
  const normalizedPath = normalizePathWithoutLocale(pathname, locales);

  if (ALWAYS_PUBLIC_EXACT.includes(normalizedPath)) {
    return true;
  }

  if (PUBLIC_ROUTE_PREFIXES.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))) {
    return true;
  }

  if (ALWAYS_PUBLIC_PREFIXES.some((prefix) => normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`))) {
    return true;
  }

  return STATIC_ASSET_PATTERN.test(normalizedPath);
};

import { create, createJSONStorage, persist } from "./zustand";
import { ALL_FEATURE_KEYS, resolveFeatures } from "@/lib/features/featureRegistry";

const AUTH_ROUTES = ALL_FEATURE_KEYS;

const normalizePath = (path = "") => {
  if (!path) {
    return "/";
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return normalized;
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

const normalizeTenantScopedPath = (path = "") => {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);

  if (!parts.length) {
    return normalized;
  }

  const hasLocale = LOCALE_PATTERN.test(parts[0]);

  const routeParts = hasLocale ? parts.slice(1) : parts;
  const [moduleName, tenantId] = routeParts;

  if (AUTH_ROUTES.includes(moduleName) && tenantId) {
    return `/${moduleName}`;
  }

  return normalized;
};

const collectUrls = (items = []) => {
  return items.flatMap((item) => {
    if (!item) {
      return [];
    }
    const url = item.url ?? item.href;
    const children = Array.isArray(item.items) ? item.items : [];
    return [url, ...collectUrls(children)].filter(Boolean);
  });
};

const buildPermissionsMap = (navMain = []) => {
  const urls = collectUrls(navMain);
  return urls.reduce((acc, path) => {
    acc[normalizePath(path)] = true;
    return acc;
  }, {});
};

export const useAuthStore = create(
  persist(
    (set, get, api) => ({
      user: null,
      token: null,
      tenant: null,
      tenantId: "",
      companyId: "",
      kind: "",
      isOwner: false,
      availableSedes: [],
      navMain: [],
      // Entitlements de la cuenta. Solo para presentacion: quien decide de
      // verdad es el middleware (paginas) y el gate de la API (datos).
      features: [],
      permissionsMap: {},
      isAuthenticated: false,
      hasHydrated: false,
      loginSuccess: (data = {}) => {
        const token = data.token ?? null;
        const user = data.user ?? null;
        const tenant = data.tenant ?? null;
        const tenantId = String(data.tenantId ?? tenant?.tenantId ?? tenant?.id ?? "");
        const companyId = String(data.companyId ?? "");
        const kind = String(data.kind ?? "");
        const isOwner = kind === "owner";
        const availableSedes = Array.isArray(data.availableSedes)
          ? data.availableSedes
          : [];
        const currentNavMain = get?.()?.navMain;
        const navMain = Array.isArray(data.navMain)
          ? data.navMain
          : Array.isArray(currentNavMain)
            ? currentNavMain
            : [];
        const permissionsMap = buildPermissionsMap(navMain);
        const currentFeatures = get?.()?.features;
        const features = Array.isArray(data.features)
          ? resolveFeatures(data.features)
          : Array.isArray(currentFeatures)
            ? currentFeatures
            : [];

        set({
          token,
          user,
          tenant,
          tenantId,
          companyId,
          kind,
          isOwner,
          availableSedes,
          navMain,
          features,
          permissionsMap,
          isAuthenticated: Boolean(token || user || tenantId || companyId),
        });
      },
      logout: () => {
        set({
          token: null,
          user: null,
          tenant: null,
          tenantId: "",
          companyId: "",
          kind: "",
          isOwner: false,
          availableSedes: [],
          navMain: [],
          features: [],
          permissionsMap: {},
          isAuthenticated: false,
        });
        api.persist?.clearStorage?.();
      },
      hasAccess: (path) => {
        const normalizedPath = normalizeTenantScopedPath(path);
        const permissionsMap = get?.()?.permissionsMap ?? {};
        const hasConfiguredPermissions =
          Object.keys(permissionsMap).length > 0;

        if (!hasConfiguredPermissions) {
          return normalizedPath === "/dashboard";
        }

        return Boolean(permissionsMap[normalizedPath]);
      },
      hydrate: () => {
        api.persist?.rehydrate();
      },
    }),
    {
      name: "pos-auth",
      storage:
        typeof window !== "undefined"
          ? createJSONStorage(() => window.localStorage)
          : undefined,
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        tenant: state.tenant,
        tenantId: state.tenantId,
        companyId: state.companyId,
        kind: state.kind,
        isOwner: state.isOwner,
        availableSedes: state.availableSedes,
        navMain: state.navMain,
        features: state.features,
        permissionsMap: state.permissionsMap,
      }),
      onRehydrateStorage: (set, get) => () => {
        const currentState = get?.() ?? {};
        const nextPermissionsMap =
          currentState.permissionsMap &&
          Object.keys(currentState.permissionsMap).length > 0
            ? currentState.permissionsMap
            : buildPermissionsMap(currentState.navMain);

        set({
          isAuthenticated: Boolean(
            currentState.token ||
              currentState.user ||
              currentState.tenantId ||
              currentState.companyId
          ),
          permissionsMap: nextPermissionsMap,
          features: Array.isArray(currentState.features) ? currentState.features : [],
          hasHydrated: true,
        });
      },
    }
  )
);

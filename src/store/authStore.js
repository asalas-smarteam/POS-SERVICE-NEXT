import { create, createJSONStorage, persist } from "./zustand";

const AUTH_ROUTES = [
  "dashboard",
  "orders",
  "active-orders",
  "kitchen",
  "users",
  "products",
  "ingredients",
  "settings",
  "floor",
];

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
      navMain: [],
      permissionsMap: {},
      isAuthenticated: false,
      hasHydrated: false,
      loginSuccess: (data = {}) => {
        const token = data.token ?? null;
        const user = data.user ?? null;
        const tenant = data.tenant ?? null;
        const tenantId = String(data.tenantId ?? tenant?.tenantId ?? tenant?.id ?? "");
        const currentNavMain = get?.()?.navMain;
        const navMain = Array.isArray(data.navMain)
          ? data.navMain
          : Array.isArray(currentNavMain)
            ? currentNavMain
            : [];
        const permissionsMap = buildPermissionsMap(navMain);

        set({
          token,
          user,
          tenant,
          tenantId,
          navMain,
          permissionsMap,
          isAuthenticated: Boolean(token || user || tenantId),
        });
      },
      logout: () => {
        set({
          token: null,
          user: null,
          tenant: null,
          tenantId: "",
          navMain: [],
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
        navMain: state.navMain,
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
            currentState.token || currentState.user || currentState.tenantId
          ),
          permissionsMap: nextPermissionsMap,
          hasHydrated: true,
        });
      },
    }
  )
);

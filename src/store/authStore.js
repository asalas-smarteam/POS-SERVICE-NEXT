import { create, persist } from "./zustand";

export const useAuthStore = create(
  persist(
    (set, get, api) => ({
      user: null,
      token: null,
      tenant: null,
      navMain: [],
      // Cachea permisos derivados de navMain para no recalcular en cada render.
      permissionsMap: {},
      isAuthenticated: false,
      hasHydrated: false,
      loginSuccess: (data = {}) => {
        const token = data.token ?? null;
        const user = data.user ?? null;
        const tenant = data.tenant ?? null;
        const currentNavMain = get?.()?.navMain;
        const navMain = Array.isArray(data.navMain)
          ? data.navMain
          : Array.isArray(currentNavMain)
            ? currentNavMain
            : [];
        // Se construye UNA sola vez al hacer login y se persiste.
        const permissionsMap = buildPermissionsMap(navMain);
        set({
          token,
          user,
          tenant,
          navMain,
          permissionsMap,
          isAuthenticated: Boolean(token),
        });
      },
      logout: () => {
        set({
          token: null,
          user: null,
          tenant: null,
          navMain: [],
          permissionsMap: {},
          isAuthenticated: false,
        });
        api.persist?.clearStorage?.();
      },
      // Helper centralizado para validar permisos desde cualquier layout/guard.
      hasAccess: (path) => {
        const normalizedPath = normalizePath(path);
        const permissionsMap = get?.()?.permissionsMap ?? {};
        const hasConfiguredPermissions =
          Object.keys(permissionsMap).length > 0;

        if (!hasConfiguredPermissions) {
          return normalizedPath === "/home";
        }

        return Boolean(permissionsMap[normalizedPath]);
      },
      hydrate: () => {
        api.persist?.rehydrate();
      },
    }),
    {
      name: "pos-auth",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        tenant: state.tenant,
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
          isAuthenticated: Boolean(currentState.token),
          permissionsMap: nextPermissionsMap,
          hasHydrated: true,
        });
      },
    }
  )
);

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

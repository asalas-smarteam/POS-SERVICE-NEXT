import { create, persist } from "./zustand";

export const useAuthStore = create(
  persist(
    (set, get, api) => ({
      user: null,
      token: null,
      tenant: null,
      navMain: [],
      isAuthenticated: false,
      hasHydrated: false,
      loginSuccess: (data = {}) => {
        const token = data.token ?? null;
        const user = data.user ?? null;
        const tenant = data.tenant ?? null;
        const navMain = Array.isArray(data.navMain) ? data.navMain : [];
        set({
          token,
          user,
          tenant,
          navMain,
          isAuthenticated: Boolean(token),
        });
      },
      logout: () => {
        set({
          token: null,
          user: null,
          tenant: null,
          navMain: [],
          isAuthenticated: false,
        });
        api.persist?.clearStorage?.();
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
      }),
      onRehydrateStorage: (set, get) => () => {
        const currentState = get?.() ?? {};
        set({
          isAuthenticated: Boolean(currentState.token),
          hasHydrated: true,
        });
      },
    }
  )
);

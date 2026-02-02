import { create, persist } from "./zustand";

export const useAuthStore = create(
  persist(
    (set, get, api) => ({
      user: null,
      token: null,
      tenant: null,
      isAuthenticated: false,
      hasHydrated: false,
      loginSuccess: (data = {}) => {
        const token = data.token ?? null;
        const user = data.user ?? null;
        const tenant = data.tenant ?? null;
        set({
          token,
          user,
          tenant,
          isAuthenticated: Boolean(token),
        });
      },
      logout: () =>
        set({
          token: null,
          user: null,
          tenant: null,
          isAuthenticated: false,
        }),
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
      }),
      onRehydrateStorage: (set, get) => () => {
        set({
          isAuthenticated: Boolean(get().token),
          hasHydrated: true,
        });
      },
    }
  )
);

import { create } from "./zustand";
import { useAuthStore } from "./authStore";

const getTenantHeader = () => {
  const tenant = useAuthStore.getState().tenant;
  const tenantSlug = tenant?.slug ?? tenant ?? null;
  return tenantSlug ? { "x-tenant": tenantSlug } : {};
};

export const useProductSizesStore = create((set) => ({
  sizes: [],
  loading: false,
  error: null,
  fetchSizes: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/product-sizes", {
        headers: {
          ...getTenantHeader(),
        },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "Failed to load product sizes.");
      }

      set({
        sizes: Array.isArray(body?.data) ? body.data : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error?.message || "Failed to load product sizes.",
        loading: false,
      });
    }
  },
}));

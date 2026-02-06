import { create } from "./zustand";
import { useAuthStore } from "./authStore";

const INITIAL_PAGE_SIZE = 9;
const getTenantHeader = () => {
  const tenant = useAuthStore.getState().tenant;
  const tenantSlug = tenant?.slug ?? tenant ?? null;
  return tenantSlug ? { "x-tenant": tenantSlug } : {};
};

export const useProductsStore = create((set, get) => ({
  products: [],
  ingredients: [],
  loading: false,
  actionLoading: false,
  error: null,
  viewMode: "grid",
  searchTerm: "",
  categoryFilter: "all",
  page: 1,
  pageSize: INITIAL_PAGE_SIZE,
  setViewMode: (viewMode) => set({ viewMode }),
  setSearchTerm: (searchTerm) => set({ searchTerm, page: 1 }),
  setCategoryFilter: (categoryFilter) => set({ categoryFilter, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/products", {
      headers: {
        ...getTenantHeader(),
      },
    });
      if (!response.ok) {
        throw new Error("No se pudieron cargar los productos.");
      }
      const data = await response.json();
      set({ products: Array.isArray(data) ? data : [], loading: false });
    } catch (error) {
      set({
        error: error?.message || "Error al cargar productos.",
        loading: false,
      });
    }
  },
  fetchIngredients: async () => {
    try {
      const response = await fetch("/api/ingredients", {
        headers: {
          ...getTenantHeader(),
        },
      });
      if (!response.ok) {
        throw new Error("No se pudieron cargar los ingredientes.");
      }
      const data = await response.json();
      set({ ingredients: Array.isArray(data) ? data : [] });
    } catch (error) {
      set({ error: error?.message || "Error al cargar ingredientes." });
    }
  },
  createProduct: async (payload) => {
    set({ actionLoading: true, error: null });
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json",
        ...getTenantHeader(),
      },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("No se pudo crear el producto.");
      }
      await get().fetchProducts();
      set({ actionLoading: false });
      return { success: true };
    } catch (error) {
      set({
        error: error?.message || "Error al crear producto.",
        actionLoading: false,
      });
      return { success: false, message: error?.message };
    }
  },
  updateProduct: async (id, payload) => {
    set({ actionLoading: true, error: null });
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json",
        ...getTenantHeader(),
      },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("No se pudo actualizar el producto.");
      }
      await get().fetchProducts();
      set({ actionLoading: false });
      return { success: true };
    } catch (error) {
      set({
        error: error?.message || "Error al actualizar producto.",
        actionLoading: false,
      });
      return { success: false, message: error?.message };
    }
  },
}));


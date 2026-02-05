import { create } from "./zustand";
import { useAuthStore } from "./authStore";

const INITIAL_PAGE_SIZE = 9;
const getTenantHeader = () => {
  const tenant = useAuthStore.getState().tenant;
  const tenantSlug = tenant?.slug ?? tenant ?? null;
  return tenantSlug ? { "x-tenant": tenantSlug } : {};
};

export const useIngredientsStore = create((set, get) => ({
  ingredients: [],
  loading: false,
  actionLoading: false,
  error: null,
  viewMode: "grid",
  searchTerm: "",
  page: 1,
  pageSize: INITIAL_PAGE_SIZE,
  setViewMode: (viewMode) => set({ viewMode }),
  setSearchTerm: (searchTerm) => set({ searchTerm, page: 1 }),
  setPage: (page) => set({ page }),
  setPageSize: (pageSize) => set({ pageSize, page: 1 }),
  fetchIngredients: async () => {
    set({ loading: true, error: null });
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
      set({ ingredients: Array.isArray(data) ? data : [], loading: false });
    } catch (error) {
      set({
        error: error?.message || "Error al cargar ingredientes.",
        loading: false,
      });
    }
  },
  createIngredient: async (payload) => {
    set({ actionLoading: true, error: null });
    try {
      const response = await fetch("/api/ingredients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeader(),
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("No se pudo crear el ingrediente.");
      }
      await get().fetchIngredients();
      set({ actionLoading: false });
      return { success: true };
    } catch (error) {
      set({
        error: error?.message || "Error al crear ingrediente.",
        actionLoading: false,
      });
      return { success: false, message: error?.message };
    }
  },
  updateIngredient: async (id, payload) => {
    set({ actionLoading: true, error: null });
    try {
      const response = await fetch(`/api/ingredients/${id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getTenantHeader(),
          },
          body: JSON.stringify(payload),
        }
      );
      if (!response.ok) {
        throw new Error("No se pudo actualizar el ingrediente.");
      }
      await get().fetchIngredients();
      set({ actionLoading: false });
      return { success: true };
    } catch (error) {
      set({
        error: error?.message || "Error al actualizar ingrediente.",
        actionLoading: false,
      });
      return { success: false, message: error?.message };
    }
  },
  deleteIngredient: async (id) => {
    set({ actionLoading: true, error: null });
    try {
      const response = await fetch(`/api/ingredients/${id}`,
        {
          method: "DELETE",
          headers: {
            ...getTenantHeader(),
          },
        }
      );
      if (!response.ok) {
        throw new Error("No se pudo eliminar el ingrediente.");
      }
      await get().fetchIngredients();
      set({ actionLoading: false });
      return { success: true };
    } catch (error) {
      set({
        error: error?.message || "Error al eliminar ingrediente.",
        actionLoading: false,
      });
      return { success: false, message: error?.message };
    }
  },
}));

import { create } from "./zustand";
import { useAuthStore } from "./authStore";

const getTenantHeader = () => {
  const tenant = useAuthStore.getState().tenant;
  const tenantSlug = tenant?.slug ?? tenant ?? null;
  return tenantSlug ? { "x-tenant": tenantSlug } : {};
};

const findCategorySetting = (settings = []) => {
  const normalized = Array.isArray(settings) ? settings : [];
  return normalized.find((setting) => {
    const description = setting?.description?.toLowerCase() ?? "";
    return (
      description.includes("product category") ||
      description.includes("categoria")
    );
  });
};

const buildCategoryLookup = (categories = []) =>
  categories.reduce((acc, category) => {
    if (category?.id) {
      acc[category.id] = category.label ?? category.id;
    }
    return acc;
  }, {});

const buildCategoryData = (settings = []) => {
  const setting = findCategorySetting(settings);
  const categories = Array.isArray(setting?.data) ? setting.data : [];
  return {
    allCategories: categories,
    activeCategories: categories.filter((category) => category?.active === true),
    categoryLookup: buildCategoryLookup(categories),
  };
};

export const useSettingsStore = create((set, get) => ({
  settings: [],
  categories: [],
  categoryLookup: {},
  loading: false,
  error: null,
  hasFetched: false,
  fetchSettings: async ({ force = false } = {}) => {
    if (get().hasFetched && !force) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/settings", {
        headers: {
          ...getTenantHeader(),
        },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "No se pudieron cargar las configuraciones.");
      }
      const settings = Array.isArray(body) ? body : [];
      const categoryData = buildCategoryData(settings);
      set({
        settings,
        categories: categoryData.activeCategories,
        categoryLookup: categoryData.categoryLookup,
        loading: false,
        error: null,
        hasFetched: true,
      });
    } catch (error) {
      set({
        error: error?.message || "No se pudieron cargar las configuraciones.",
        loading: false,
        hasFetched: true,
      });
    }
  },
}));

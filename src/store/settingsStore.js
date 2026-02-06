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

const findUnitsSetting = (settings = []) => {
  const normalized = Array.isArray(settings) ? settings : [];
  return normalized.find((setting) => {
    const description = setting?.description?.toLowerCase() ?? "";
    return description.includes("units") || description.includes("unidad");
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

const DEFAULT_INGREDIENT_UNITS = [
  { id: "unit", label: "Unidad" },
  { id: "g", label: "Gramos" },
  { id: "kg", label: "Kilos" },
  { id: "ml", label: "Mililitros" },
  { id: "l", label: "Litros" },
];

const buildUnitLookup = (units = []) =>
  units.reduce((acc, unit) => {
    if (unit?.id) {
      acc[unit.id] = unit.label ?? unit.id;
    }
    return acc;
  }, {});

const buildUnitData = (settings = []) => {
  const setting = findUnitsSetting(settings);
  const configuredUnits = Array.isArray(setting?.data?.ingredients)
    ? setting.data.ingredients
    : [];
  const ingredientUnits =
    configuredUnits.length > 0 ? configuredUnits : DEFAULT_INGREDIENT_UNITS;
  return {
    ingredientUnits,
    ingredientUnitLookup: buildUnitLookup(ingredientUnits),
  };
};

export const useSettingsStore = create((set) => ({
  settings: [],
  categories: [],
  categoryLookup: {},
  ingredientUnits: DEFAULT_INGREDIENT_UNITS,
  ingredientUnitLookup: buildUnitLookup(DEFAULT_INGREDIENT_UNITS),
  loading: false,
  error: null,
  hasFetched: false,
  fetchSettings: async () => {
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
      const unitData = buildUnitData(settings);
      set({
        settings,
        categories: categoryData.activeCategories,
        categoryLookup: categoryData.categoryLookup,
        ingredientUnits: unitData.ingredientUnits,
        ingredientUnitLookup: unitData.ingredientUnitLookup,
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

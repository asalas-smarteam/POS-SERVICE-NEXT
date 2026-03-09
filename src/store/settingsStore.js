import { create } from "./zustand";
import { getTenantHeaders } from "./tenantHeaders";
import { DEFAULT_HALF_AND_HALF_PRICING, normalizeHalfAndHalfPricing } from "@/lib/tenant/halfAndHalfPricingSettings";
import {
  DEFAULT_PAYMENT_STRATEGY,
  DEFAULT_PAYMENT_STRATEGY_OPTIONS,
  PAYMENT_STRATEGY_OPTIONS_DESCRIPTION,
  normalizePaymentStrategy,
  normalizePaymentStrategyOptions,
} from "@/lib/tenant/paymentStrategySettings";
import { DEFAULT_ORDER_TYPES, normalizeOrderTypes } from "@/lib/tenant/orderTypeSettings";
import {
  DEFAULT_PRICING_STRATEGY_OPTIONS,
  PRICING_STRATEGY_OPTIONS_DESCRIPTION,
  normalizePricingStrategyOptions,
} from "@/lib/tenant/pricingStrategySettings";

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

const buildHalfAndHalfPricing = (settings = []) => {
  const normalized = Array.isArray(settings) ? settings : [];
  const baseSetting = normalized.find((setting) => setting?.description === "Settings");
  const pricingOptionsSetting = normalized.find(
    (setting) => setting?.description === PRICING_STRATEGY_OPTIONS_DESCRIPTION
  );
  const strategies = normalizePricingStrategyOptions(pricingOptionsSetting?.data).map((option) => option.value);
  return normalizeHalfAndHalfPricing(baseSetting?.data?.halfAndHalfPricing || DEFAULT_HALF_AND_HALF_PRICING, strategies);
};

const buildPaymentStrategy = (settings = []) => {
  const normalized = Array.isArray(settings) ? settings : [];
  const baseSetting = normalized.find((setting) => setting?.description === "Settings");
  const optionsSetting = normalized.find(
    (setting) => setting?.description === PAYMENT_STRATEGY_OPTIONS_DESCRIPTION
  );
  const options = normalizePaymentStrategyOptions(optionsSetting?.data);
  return normalizePaymentStrategy(baseSetting?.data?.paymentStrategy || DEFAULT_PAYMENT_STRATEGY, options);
};

const buildOrderTypes = (settings = []) => {
  const normalized = Array.isArray(settings) ? settings : [];
  const baseSetting = normalized.find((setting) => setting?.description === "Settings");
  return normalizeOrderTypes(baseSetting?.data?.orderTypes || DEFAULT_ORDER_TYPES);
};

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
  halfAndHalfPricing: DEFAULT_HALF_AND_HALF_PRICING,
  paymentStrategy: DEFAULT_PAYMENT_STRATEGY,
  pricingStrategyOptions: DEFAULT_PRICING_STRATEGY_OPTIONS,
  paymentStrategyOptions: DEFAULT_PAYMENT_STRATEGY_OPTIONS,
  orderTypes: DEFAULT_ORDER_TYPES,
  loading: false,
  error: null,
  hasFetched: false,
  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const response = await fetch("/api/settings", {
        headers: {
          ...getTenantHeaders(),
        },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || "No se pudieron cargar las configuraciones.");
      }
      const settings = Array.isArray(body) ? body : [];
      const categoryData = buildCategoryData(settings);
      const unitData = buildUnitData(settings);
      const halfAndHalfPricing = buildHalfAndHalfPricing(settings);
      const paymentStrategy = buildPaymentStrategy(settings);
      const pricingOptionsSetting = settings.find(
        (setting) => setting?.description === PRICING_STRATEGY_OPTIONS_DESCRIPTION
      );
      const paymentOptionsSetting = settings.find(
        (setting) => setting?.description === PAYMENT_STRATEGY_OPTIONS_DESCRIPTION
      );
      const pricingStrategyOptions = normalizePricingStrategyOptions(pricingOptionsSetting?.data);
      const paymentStrategyOptions = normalizePaymentStrategyOptions(paymentOptionsSetting?.data);
      const orderTypes = buildOrderTypes(settings);
      set({
        settings,
        categories: categoryData.activeCategories,
        categoryLookup: categoryData.categoryLookup,
        ingredientUnits: unitData.ingredientUnits,
        ingredientUnitLookup: unitData.ingredientUnitLookup,
        halfAndHalfPricing,
        paymentStrategy,
        pricingStrategyOptions,
        paymentStrategyOptions,
        orderTypes,
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

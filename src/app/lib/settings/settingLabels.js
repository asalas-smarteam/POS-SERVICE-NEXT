// Visual-only labels for the raw `description` field stored on each tenant
// setting document. The stored value stays in English; only the on-screen
// label changes with the active locale.
const DESCRIPTION_LABELS = {
  Settings: { es: "Configuración", en: "Settings" },
  "Product Category": { es: "Categoría de productos", en: "Product Category" },
  Units: { es: "Unidades", en: "Units" },
  "Product Sizes": { es: "Tamaños", en: "Product Sizes" },
};

export const getDescriptionLabel = (description, locale) =>
  DESCRIPTION_LABELS[description]?.[locale] ?? description;

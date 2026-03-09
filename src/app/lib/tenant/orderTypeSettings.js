export const DEFAULT_ORDER_TYPES = [
  { id: "takeaway", label: "Para llevar", isDefault: true },
  { id: "awaitsOrder", label: "Espera", isDefault: true },
  { id: "onTable", label: "En mesa", isDefault: true },
];

const REQUIRED_DEFAULT_IDS = DEFAULT_ORDER_TYPES.map((type) => type.id);

const normalizeOrderTypeItem = (item) => {
  if (!item || typeof item !== "object") {
    return null;
  }

  const id = typeof item.id === "string" ? item.id.trim() : "";
  const label = typeof item.label === "string" ? item.label.trim() : "";
  if (!id || !label) {
    return null;
  }

  const baseDefault = DEFAULT_ORDER_TYPES.find((defaultType) => defaultType.id === id);

  return {
    id,
    label,
    isDefault: Boolean(baseDefault || item.isDefault),
  };
};

export function normalizeOrderTypes(value) {
  const configured = Array.isArray(value) ? value : [];

  const normalizedConfigured = configured
    .map(normalizeOrderTypeItem)
    .filter(Boolean);

  const byId = new Map();

  for (const type of DEFAULT_ORDER_TYPES) {
    byId.set(type.id, { ...type });
  }

  for (const type of normalizedConfigured) {
    if (REQUIRED_DEFAULT_IDS.includes(type.id)) {
      byId.set(type.id, { ...type, isDefault: true });
      continue;
    }
    byId.set(type.id, type);
  }

  return Array.from(byId.values());
}

export function validateOrderTypes(value) {
  if (!Array.isArray(value)) {
    return "orderTypes must be an array";
  }

  const normalized = value.map(normalizeOrderTypeItem).filter(Boolean);
  const ids = new Set();

  for (const type of normalized) {
    if (ids.has(type.id)) {
      return "orderTypes must not include duplicated ids";
    }
    ids.add(type.id);
  }

  for (const requiredId of REQUIRED_DEFAULT_IDS) {
    if (!ids.has(requiredId)) {
      return `orderTypes must include default type '${requiredId}'`;
    }
  }

  return null;
}

export function getOrderTypeById(orderTypes, orderTypeId) {
  const normalized = normalizeOrderTypes(orderTypes);
  return normalized.find((type) => type.id === orderTypeId) || normalized[0] || null;
}

const getStringValue = (value) =>
  typeof value === "string" ? value.trim() : "";

const resolveItemName = (item = {}) => {
  const productName = getStringValue(item?.productName);
  if (productName) {
    return productName;
  }
  const fallbackName = getStringValue(item?.name);
  return fallbackName || "Product";
};

const buildIngredientsLine = (item = {}) => {
  if (item?.type !== "COMPOSED") {
    return [];
  }

  const sourceList = Array.isArray(item?.modifiers)
    ? item.modifiers
    : Array.isArray(item?.baseIngredients)
      ? item.baseIngredients
      : [];

  const ingredientNames = sourceList
    .map((entry) => getStringValue(entry?.name))
    .filter(Boolean);

  if (!ingredientNames.length) {
    return [];
  }

  return [`Ingredients: ${ingredientNames.join(", ")}`];
};

const buildModifierLines = (item = {}) => {
  if (item?.type !== "COMPOSED") {
    return [];
  }

  const modifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];
  return modifiers.flatMap((modifier) => {
    const name = getStringValue(modifier?.name).toLowerCase();
    if (!name) {
      return [];
    }

    const baseQuantity = Number(modifier?.baseQuantity ?? 0);
    const quantity = Number(modifier?.quantity ?? 0);

    if (baseQuantity > 0 && quantity === 0) {
      return [`- no ${name}`];
    }

    if (quantity > baseQuantity) {
      return [`+ extra ${name}`];
    }

    return [];
  });
};

const buildNotesLines = (item = {}) => {
  if (Array.isArray(item?.notes)) {
    return item.notes
      .map((note) => getStringValue(note))
      .filter(Boolean)
      .map((note) => `Notes: ${note}`);
  }

  const noteText = getStringValue(item?.note ?? item?.notes);
  return noteText ? [`Notes: ${noteText}`] : [];
};

export function getOrderItemDisplayData(item) {
  const safeItem = item ?? {};
  const hasHalf = Boolean(safeItem?.isHalfAndHalf && safeItem?.halves?.[0]);
  const baseName = resolveItemName(safeItem);
  const halfName = hasHalf ? resolveItemName(safeItem.halves[0]) : "";

  const title = hasHalf && halfName
    ? `Half ${baseName} / Half ${halfName}`
    : baseName;

  const subtitleLines = [
    ...buildIngredientsLine(safeItem),
    ...buildModifierLines(safeItem),
    ...buildNotesLines(safeItem),
  ];

  return {
    title,
    subtitleLines,
  };
}

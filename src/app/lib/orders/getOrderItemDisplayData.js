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

const buildIngredientSections = (item = {}) => {
  const modifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];

  const ingredients = [];
  const extras = [];
  const removed = [];

  modifiers.forEach((modifier) => {
    const name = getStringValue(modifier?.name);
    if (!name) return;

    const baseQuantity = Math.max(0, Number(modifier?.baseQuantity ?? 0));
    const quantity = Math.max(0, Number(modifier?.quantity ?? 0));

    if (baseQuantity > 0) {
      ingredients.push(name);
      if (quantity === 0) {
        removed.push(name);
        return;
      }
      if (quantity > baseQuantity) {
        extras.push(name);
      }
      return;
    }

    if (quantity > 0) {
      extras.push(name);
    }
  });

  return { ingredients, extras, removed };
};

export function getOrderItemDisplayData(item) {
  const safeItem = item ?? {};
  const hasHalf = Boolean(safeItem?.isHalfAndHalf && safeItem?.halves?.[0]);
  const baseName = resolveItemName(safeItem);
  const halfName = hasHalf ? resolveItemName(safeItem.halves[0]) : "";

  const title = hasHalf && halfName
    ? `Half ${baseName} / Half ${halfName}`
    : baseName;

  const { ingredients, extras, removed } = buildIngredientSections(safeItem);

  const subtitleLines = [
    ...(ingredients.length ? [`Ingredients: ${ingredients.join(", ")}`] : []),
    ...(extras.length ? [`Extras: ${extras.join(", ")}`] : []),
    ...(removed.length ? [`Removed: ${removed.join(", ")}`] : []),
    ...(getStringValue(safeItem?.note)
      ? [`Cashier Note: ${getStringValue(safeItem?.note)}`]
      : []),
  ];

  return {
    title,
    subtitleLines,
  };
}

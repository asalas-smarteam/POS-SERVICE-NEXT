const getStringValue = (value) =>
  typeof value === "string" ? value.trim() : "";

const resolveName = (entry) => {
  if (typeof entry === "string") {
    return getStringValue(entry);
  }

  const name = getStringValue(entry?.name);
  if (name) return name;

  return getStringValue(entry?.productName);
};

const toNameList = (entries) => {
  if (!Array.isArray(entries)) {
    return [];
  }

  return entries.map(resolveName).filter(Boolean);
};

const normalizeName = (value) => getStringValue(value).toLowerCase();

const splitNoteText = (value) =>
  getStringValue(value)
    .split(",")
    .map((entry) => getStringValue(entry))
    .filter(Boolean);

const buildModifierData = (item = {}) => {
  const modifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];

  const ingredients = [];
  const extras = [];
  const removed = [];

  modifiers.forEach((modifier) => {
    const name = getStringValue(modifier?.name);
    if (!name) {
      return;
    }

    const baseQuantity = Math.max(0, Number(modifier?.baseQuantity ?? 0));
    const quantity = Math.max(0, Number(modifier?.quantity ?? 0));

    for (let index = 0; index < baseQuantity; index += 1) {
      ingredients.push(name);
    }

    if (baseQuantity > 0 && quantity === 0) {
      removed.push(name);
      return;
    }

    if (quantity > baseQuantity) {
      const extraCount = quantity - baseQuantity;
      for (let index = 0; index < extraCount; index += 1) {
        extras.push(`extra ${normalizeName(name)}`);
      }
      return;
    }

    if (baseQuantity === 0 && quantity > 0) {
      for (let index = 0; index < quantity; index += 1) {
        extras.push(`extra ${normalizeName(name)}`);
      }
    }
  });

  const generatedNotes = new Set([
    ...extras.map((extra) => normalizeName(extra)),
    ...removed.map((name) => `remove ${normalizeName(name)}`),
    ...removed.map((name) => `quitar ${normalizeName(name)}`),
  ]);

  return {
    ingredients,
    extras,
    removed,
    generatedNotes,
  };
};

const buildNotes = (item = {}) => {
  const cashierNote = getStringValue(item?.note);
  return cashierNote || null;
};

export function getKitchenItemDisplayData(item) {
  const safeItem = item ?? {};
  const productName = resolveName({
    name: safeItem?.productName,
    productName: safeItem?.name,
  }) || "Product";

  const hasHalf = Boolean(safeItem?.isHalfAndHalf && safeItem?.halves?.[0]);
  const firstHalfName = hasHalf ? resolveName(safeItem.halves[0]) : "";

  const title = hasHalf && firstHalfName
    ? `Half ${productName} / Half ${firstHalfName}`
    : productName;

  const modifierData = buildModifierData(safeItem);
  const ingredientList = modifierData.ingredients.length
    ? modifierData.ingredients
    : toNameList(safeItem?.ingredients);

  const extrasList = modifierData.extras.length
    ? modifierData.extras
    : toNameList(safeItem?.extraIngredients);

  const removedList = modifierData.removed.length
    ? modifierData.removed
    : toNameList(safeItem?.removedIngredients);

  return {
    title,
    ingredients: ingredientList,
    extras: extrasList,
    removed: removedList,
    notes: buildNotes(safeItem),
  };
}

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
  const extraIngredients = Array.isArray(item?.extraIngredients)
    ? item.extraIngredients
    : [];
  const removedIngredients = Array.isArray(item?.removedIngredients)
    ? item.removedIngredients
    : [];

  const ingredients = [];
  const extras = [];
  const removed = [];

  const ingredientNames = new Set();
  modifiers.forEach((modifier) => {
    const name = getStringValue(modifier?.name);
    const normalized = normalizeName(name);

    if (!normalized || ingredientNames.has(normalized)) {
      return;
    }

    ingredientNames.add(normalized);
    ingredients.push(name);
  });

  const extraNames = new Set();
  extraIngredients.forEach((entry) => {
    const name =
      getStringValue(entry?.name) ||
      getStringValue(entry?.ingredient?.name) ||
      getStringValue(entry?.ingredientId?.name) ||
      resolveName(entry);
    const normalized = normalizeName(name);

    if (!normalized || extraNames.has(normalized)) {
      return;
    }

    extraNames.add(normalized);
    extras.push(`extra ${name}`);
  });

  const removedNames = new Set();
  removedIngredients.forEach((entry) => {
    const name =
      getStringValue(entry?.name) ||
      getStringValue(entry?.ingredient?.name) ||
      getStringValue(entry?.ingredientId?.name) ||
      resolveName(entry);
    const normalized = normalizeName(name);

    if (!normalized || removedNames.has(normalized)) {
      return;
    }

    removedNames.add(normalized);
    removed.push(name);
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

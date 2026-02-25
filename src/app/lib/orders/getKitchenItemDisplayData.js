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

const buildNotes = (item = {}) => {
  const notesList = Array.isArray(item?.notes)
    ? item.notes.map((note) => getStringValue(note)).filter(Boolean)
    : [];

  const singleNote = getStringValue(item?.note ?? item?.notes);
  const merged = singleNote ? [...notesList, singleNote] : notesList;

  if (!merged.length) {
    return null;
  }

  return merged.join(" · ");
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

  return {
    title,
    ingredients: toNameList(safeItem?.ingredients),
    extras: toNameList(safeItem?.extraIngredients),
    removed: toNameList(safeItem?.removedIngredients),
    notes: buildNotes(safeItem),
  };
}

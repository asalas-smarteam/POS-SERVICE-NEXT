function normalizeId(value) {
  if (value === null || value === undefined) {
    return '';
  }

  if (typeof value === 'string') {
    return value;
  }

  if (typeof value === 'object') {
    if (typeof value.toString === 'function') {
      return value.toString();
    }

    return '';
  }

  return String(value);
}

function safeNumber(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return parsed;
}

function addToMap(map, id, qty) {
  const normalizedId = normalizeId(id);

  if (!normalizedId) {
    return;
  }

  const safeQty = safeNumber(qty);

  if (!safeQty) {
    return;
  }

  const currentQty = safeNumber(map[normalizedId]);
  map[normalizedId] = currentQty + safeQty;
}

function getIngredients(product) {
  if (!product || !Array.isArray(product.ingredients)) {
    return [];
  }

  return product.ingredients;
}

function multiplyAndAddIngredients(targetMap, ingredients, multiplier) {
  const safeMultiplier = safeNumber(multiplier);

  if (!safeMultiplier) {
    return;
  }

  ingredients.forEach((ingredient) => {
    const ingredientId = normalizeId(ingredient?.ingredientId);
    const quantity = safeNumber(ingredient?.quantity);

    addToMap(targetMap, ingredientId, quantity * safeMultiplier);
  });
}

function buildResultFromMap(ingredientsMap) {
  const items = Object.entries(ingredientsMap).map(([ingredientId, quantity]) => ({
    ingredientId,
    quantity: safeNumber(quantity),
  }));

  return {
    items,
    map: ingredientsMap,
  };
}

export function calculateIngredientsToDiscount(params = {}) {
  const {
    itemQuantity,
    productA,
    productB,
    isHalfAndHalf,
    removedIngredients,
    extraIngredients,
  } = params;

  const totalMap = {};
  const safeItemQuantity = safeNumber(itemQuantity) || 1;

  const removedSet = new Set(
    (Array.isArray(removedIngredients) ? removedIngredients : [])
      .map((id) => normalizeId(id))
      .filter(Boolean),
  );

  const ingredientsA = getIngredients(productA);
  const ingredientsB = getIngredients(productB);

  const shouldUseHalfAndHalf = Boolean(isHalfAndHalf && productB);

  if (shouldUseHalfAndHalf) {
    const baseIngredientsA = ingredientsA.filter((ingredient) => ingredient?.part === 'BASE');
    const toppingIngredientsA = ingredientsA.filter((ingredient) => ingredient?.part !== 'BASE');
    const toppingIngredientsB = ingredientsB.filter((ingredient) => ingredient?.part !== 'BASE');

    multiplyAndAddIngredients(totalMap, baseIngredientsA, safeItemQuantity);
    multiplyAndAddIngredients(totalMap, toppingIngredientsA, 0.5 * safeItemQuantity);
    multiplyAndAddIngredients(totalMap, toppingIngredientsB, 0.5 * safeItemQuantity);
  } else {
    multiplyAndAddIngredients(totalMap, ingredientsA, safeItemQuantity);
  }

  removedSet.forEach((ingredientId) => {
    delete totalMap[ingredientId];
  });

  (Array.isArray(extraIngredients) ? extraIngredients : []).forEach((extra) => {
    const ingredientId = normalizeId(extra?.ingredientId);
    const quantity = safeNumber(extra?.quantity) * safeItemQuantity;

    addToMap(totalMap, ingredientId, quantity);
  });

  return buildResultFromMap(totalMap);
}

/*
Example 1: Regular product discount
Input:
calculateIngredientsToDiscount({
  itemQuantity: 2,
  productA: {
    ingredients: [
      { ingredientId: 'cheese', quantity: 1, part: 'TOPPING' },
      { ingredientId: 'sauce', quantity: 0.5, part: 'BASE' },
    ],
  },
  productB: null,
  isHalfAndHalf: false,
  removedIngredients: [],
  extraIngredients: [],
});
Expected output map:
{ cheese: 2, sauce: 1 }

Example 2: Half-and-half with BASE and TOPPING split
Input:
calculateIngredientsToDiscount({
  itemQuantity: 1,
  productA: {
    ingredients: [
      { ingredientId: 'dough', quantity: 1, part: 'BASE' },
      { ingredientId: 'pepperoni', quantity: 1, part: 'TOPPING' },
    ],
  },
  productB: {
    ingredients: [
      { ingredientId: 'dough', quantity: 1, part: 'BASE' },
      { ingredientId: 'mushroom', quantity: 1, part: 'TOPPING' },
    ],
  },
  isHalfAndHalf: true,
  removedIngredients: [],
  extraIngredients: [],
});
Expected output map:
{ dough: 1, pepperoni: 0.5, mushroom: 0.5 }

Example 3: Removed + extras combined
Input:
calculateIngredientsToDiscount({
  itemQuantity: 3,
  productA: {
    ingredients: [
      { ingredientId: 'cheese', quantity: 1, part: 'TOPPING' },
      { ingredientId: 'olive', quantity: 0.5, part: 'TOPPING' },
    ],
  },
  productB: null,
  isHalfAndHalf: false,
  removedIngredients: ['olive'],
  extraIngredients: [{ ingredientId: 'cheese', quantity: 0.25 }],
});
Expected output map:
{ cheese: 3.75 }
*/

// Arma la tabla unica de precios por talle de una categoria: los talles y sus
// precios salen una vez arriba, y los platos van solo con nombre e ingredientes.
//
// El patron viene de los menus de pizzeria de referencia y asume algo que el
// modelo NO garantiza: que todos los platos cuestan lo mismo en cada talle. Cada
// talle es un Product con su precio propio (ver models/tenant/Product.js), asi
// que dos pizzas pueden diferir en "Grande".
//
// La restriccion que manda sobre todo lo demas: ningun plato puede quedar
// mostrado bajo un precio que no es el suyo. Es un menu publico que se lee por
// QR, sin sesion y sin nadie a quien preguntarle; un precio equivocado ahi
// termina en una discusion en la caja. Por eso el plato que se sale de la tabla
// se lista con SUS precios, y por eso una tabla que no representa a la mayoria
// se descarta entera.

// Un talle entra en la tabla solo si al menos la mitad de los platos lo tiene.
// Sin este piso, un talle que existe en un solo plato -una "Jumbo" que solo
// tiene la Especial- entra igual, porque con un solo dato no hay empate que lo
// frene. A partir de ahi los demas platos son excepcion por FALTARLES ese talle,
// las excepciones quedan en mayoria, y la tabla se cae en un menu que no tenia
// nada de raro.
const MIN_SHARE = 0.5;

const asMap = (value) => (value instanceof Map ? value : new Map());
const asArray = (value) => (Array.isArray(value) ? value : []);

// El precio de la tabla para un talle. Devuelve null si hay empate: ni el mas
// bajo ni el primero sirven de desempate, porque las dos reglas elegirian un
// numero que la mitad de los platos no cobra.
function mostFrequentPrice(prices) {
  const counts = new Map();
  for (const price of prices) {
    counts.set(price, (counts.get(price) ?? 0) + 1);
  }

  let best = null;
  let bestCount = 0;
  let tied = false;

  for (const [price, count] of counts) {
    if (count > bestCount) {
      best = price;
      bestCount = count;
      tied = false;
    } else if (count === bestCount) {
      tied = true;
    }
  }

  return tied ? null : best;
}

// Los talles que resuelven y aparecen en al menos un plato, en el orden del
// ajuste. Es el encabezado de la variante priceColumns: ahi no hay piso de
// mayoria ni precio comun, solo columnas.
export function sizeColumnsOf(dishes, sizeOrderMap) {
  const order = asMap(sizeOrderMap);
  const seen = new Set();

  for (const dish of asArray(dishes)) {
    for (const size of asArray(dish?.sizes)) {
      if (size.sizeId && order.has(size.sizeId)) {
        seen.add(size.sizeId);
      }
    }
  }

  return Array.from(seen)
    .map((sizeId) => ({
      sizeId,
      label: order.get(sizeId).label,
      order: order.get(sizeId).order,
    }))
    .sort((a, b) => a.order - b.order)
    .map(({ sizeId, label }) => ({ sizeId, label }));
}

export function buildSizePriceTable(dishes, sizeOrderMap) {
  const order = asMap(sizeOrderMap);
  const list = asArray(dishes);

  // Solo los talles que resuelven. groupProductsBySize ya dejo en null el
  // sizeId del producto cuyo talle fue borrado o desactivado: sin identidad de
  // talle no se puede agrupar por talle, asi que ese plato no puede calzar en
  // ninguna tabla.
  const pricesBySize = new Map();
  for (const dish of list) {
    for (const size of asArray(dish?.sizes)) {
      if (!size.sizeId || !order.has(size.sizeId)) {
        continue;
      }
      if (!pricesBySize.has(size.sizeId)) {
        pricesBySize.set(size.sizeId, []);
      }
      pricesBySize.get(size.sizeId).push(size.price);
    }
  }

  const minCount = list.length * MIN_SHARE;
  const candidates = [];
  for (const [sizeId, prices] of pricesBySize) {
    if (prices.length < minCount) {
      continue;
    }
    const price = mostFrequentPrice(prices);
    if (price === null) {
      continue;
    }
    candidates.push({
      sizeId,
      label: order.get(sizeId).label,
      price,
      order: order.get(sizeId).order,
    });
  }

  candidates.sort((a, b) => a.order - b.order);
  const sizes = candidates.map(({ sizeId, label, price }) => ({ sizeId, label, price }));

  const tableIds = sizes.map((size) => size.sizeId);
  const priceOf = new Map(sizes.map((size) => [size.sizeId, size.price]));

  // Un plato calza si tiene EXACTAMENTE los talles de la tabla, en el mismo
  // orden -groupProductsBySize y `candidates` ordenan los dos por el orden del
  // ajuste, asi que la comparacion posicional es valida- y todos al precio de
  // la tabla. Cualquier otra cosa es excepcion y lleva sus propios precios.
  let fitting = 0;
  let exceptions = 0;

  const annotated = list.map((dish) => {
    const dishSizes = asArray(dish?.sizes);
    const matches =
      tableIds.length > 0 &&
      dishSizes.length === tableIds.length &&
      dishSizes.every((size, index) => size.sizeId === tableIds[index]) &&
      dishSizes.every((size) => size.price === priceOf.get(size.sizeId));

    if (matches) {
      fitting += 1;
    } else {
      exceptions += 1;
    }

    return { ...dish, isException: !matches };
  });

  // Una tabla cuyas excepciones son mayoria no esta comunicando nada: es un
  // encabezado con doce renglones contradiciendolo. El bloque cae a
  // priceColumns, que siempre muestra el precio exacto de cada plato.
  const fellBack = sizes.length === 0 || exceptions > fitting;

  return { sizes, dishes: annotated, fellBack };
}

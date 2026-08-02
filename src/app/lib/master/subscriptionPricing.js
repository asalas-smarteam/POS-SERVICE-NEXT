// Fuente única de verdad del precio de suscripción multi-sede.
// Se usa tanto en el registro (preview en la UI) como en el provisioning
// (recálculo autoritativo en el servidor).
//
// Puro/isomórfico: lo importan componentes cliente, así que no puede tocar
// mongoose ni leer de la DB. Quien llama trae los planes, los precios de
// features y las promociones ya cargados.

import {
  ALWAYS_ON_FEATURES,
  SELECTABLE_FEATURE_KEYS,
} from '@/lib/features/featureRegistry';

const toAmount = (value) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
};

// Los precios se manejan en unidades monetarias con dos decimales; un 10% sobre
// $55 da 49.5 y sin redondear arrastraría binarios feos hasta el total.
const round = (value) => Math.round(value * 100) / 100;

export function resolvePlanPricing(plan) {
  const basePrice = Number(
    plan?.basePrice ?? plan?.priceMonthly ?? 0
  );
  const pricePerExtraBranch = Number(plan?.pricePerExtraBranch ?? 0);

  return {
    basePrice: Number.isFinite(basePrice) ? basePrice : 0,
    pricePerExtraBranch: Number.isFinite(pricePerExtraBranch)
      ? pricePerExtraBranch
      : 0,
  };
}

export function normalizeBranchCount(branchCount) {
  return Math.max(1, Math.floor(Number(branchCount) || 1));
}

export function computeSubscriptionPrice(plan, branchCount) {
  const { basePrice, pricePerExtraBranch } = resolvePlanPricing(plan);
  const extras = normalizeBranchCount(branchCount) - 1;

  return basePrice + extras * pricePerExtraBranch;
}

// ---------------------------------------------------------------------------
// Promociones
// ---------------------------------------------------------------------------

export function computeDiscount(amount, promotion) {
  const base = toAmount(amount);
  if (!base || !promotion) {
    return 0;
  }

  const value = toAmount(promotion.value);
  if (!value) {
    return 0;
  }

  const discount =
    promotion.type === 'percent' ? (base * Math.min(value, 100)) / 100 : value;

  // Nunca deja el precio en negativo.
  return round(Math.min(discount, base));
}

// De todas las promociones aplicables al mismo concepto se aplica una sola: la
// que más le conviene al cliente. Acumularlas haría que dos promos coincidentes
// regalaran el plan sin que nadie lo notara.
export function findBestPromotion(promotions, scope, targetSlug, amount) {
  const candidates = (Array.isArray(promotions) ? promotions : []).filter(
    (promotion) =>
      promotion?.scope === scope &&
      (promotion.targetSlug === targetSlug || promotion.targetSlug === '*')
  );

  let best = null;
  let bestDiscount = 0;

  for (const promotion of candidates) {
    const discount = computeDiscount(amount, promotion);
    if (discount > bestDiscount) {
      best = promotion;
      bestDiscount = discount;
    }
  }

  return best;
}

function buildLine({ kind, key, original, scope, targetSlug, promotions }) {
  const amount = round(toAmount(original));
  const promotion = findBestPromotion(promotions, scope, targetSlug, amount);
  const discount = computeDiscount(amount, promotion);

  return {
    kind,
    key,
    original: amount,
    final: round(amount - discount),
    promotion: promotion ?? null,
  };
}

// ---------------------------------------------------------------------------
// Desglose completo
// ---------------------------------------------------------------------------

const priceByKey = (featurePrices) => {
  const map = new Map();
  for (const entry of Array.isArray(featurePrices) ? featurePrices : []) {
    if (entry?.key) {
      map.set(entry.key, entry);
    }
  }
  return map;
};

// Features que se cobran sueltos: los alwaysOn (settings, users) son parte del
// funcionamiento del sistema y nunca aparecen en la factura.
const billableFeatures = (features) =>
  (Array.isArray(features) ? features : []).filter(
    (key) => SELECTABLE_FEATURE_KEYS.includes(key) && !ALWAYS_ON_FEATURES.includes(key)
  );

export function computeFeatureAddOnPrice(featurePrices, keys, branchCount) {
  const prices = priceByKey(featurePrices);
  const extras = normalizeBranchCount(branchCount) - 1;

  return billableFeatures(keys).reduce((total, key) => {
    const entry = prices.get(key);
    if (!entry) {
      return total;
    }
    return (
      total + toAmount(entry.monthlyPrice) + extras * toAmount(entry.pricePerExtraBranch)
    );
  }, 0);
}

/**
 * Arma el desglose mensual de una cuenta.
 *
 * Plan cerrado: una línea de base, una de sedes extra y una por cada add-on
 * comprado fuera del plan. Plan custom: una línea por feature elegido, más la
 * de sedes extra calculada con el aporte por sede de esos mismos features.
 *
 * Devuelve siempre `originalTotal` y `finalTotal` por separado para que la UI
 * pueda tachar el precio previo al descuento.
 */
export function buildPricingBreakdown({
  plan,
  featurePrices = [],
  features = [],
  addOnFeatures = [],
  branchCount = 1,
  promotions = [],
} = {}) {
  const count = normalizeBranchCount(branchCount);
  const extras = count - 1;
  const prices = priceByKey(featurePrices);
  const lines = [];

  if (plan?.isCustomizable) {
    let perBranch = 0;

    for (const key of billableFeatures(features)) {
      const entry = prices.get(key);
      if (!entry) {
        continue;
      }

      perBranch += toAmount(entry.pricePerExtraBranch);
      lines.push(
        buildLine({
          kind: 'feature',
          key,
          original: entry.monthlyPrice,
          scope: 'feature',
          targetSlug: key,
          promotions,
        })
      );
    }

    if (extras > 0 && perBranch > 0) {
      lines.push(
        buildLine({
          kind: 'branches',
          key: 'branches',
          original: extras * perBranch,
          scope: 'branch',
          targetSlug: plan.slug,
          promotions,
        })
      );
    }
  } else {
    const { basePrice, pricePerExtraBranch } = resolvePlanPricing(plan);

    lines.push(
      buildLine({
        kind: 'base',
        key: plan?.slug ?? 'base',
        original: basePrice,
        scope: 'plan',
        targetSlug: plan?.slug ?? '',
        promotions,
      })
    );

    if (extras > 0 && pricePerExtraBranch > 0) {
      lines.push(
        buildLine({
          kind: 'branches',
          key: 'branches',
          original: extras * pricePerExtraBranch,
          scope: 'branch',
          targetSlug: plan?.slug ?? '',
          promotions,
        })
      );
    }

    // Add-ons: solo lo comprado por fuera del plan, para no cobrar dos veces lo
    // que el plan ya incluye.
    const planFeatures = new Set(
      Array.isArray(plan?.features) ? plan.features : []
    );
    const extraKeys = billableFeatures(addOnFeatures).filter(
      (key) => !planFeatures.has(key)
    );

    for (const key of extraKeys) {
      const entry = prices.get(key);
      if (!entry) {
        continue;
      }

      lines.push(
        buildLine({
          kind: 'feature',
          key,
          original: toAmount(entry.monthlyPrice) + extras * toAmount(entry.pricePerExtraBranch),
          scope: 'feature',
          targetSlug: key,
          promotions,
        })
      );
    }
  }

  const originalTotal = round(
    lines.reduce((total, line) => total + line.original, 0)
  );
  const finalTotal = round(lines.reduce((total, line) => total + line.final, 0));

  return {
    lines,
    branchCount: count,
    originalTotal,
    finalTotal,
    hasDiscount: finalTotal < originalTotal,
    appliedPromotions: lines
      .filter((line) => line.promotion)
      .map((line) => line.promotion),
  };
}

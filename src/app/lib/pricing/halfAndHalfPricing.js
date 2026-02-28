export const HALF_PRICING_STRATEGIES = {
  HIGHEST: 'HIGHEST',
  AVERAGE: 'AVERAGE',
  BASE_PLUS: 'BASE_PLUS',
};

function toValidNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function calculateHalfAndHalfUnitPrice(options) {
  if (!options || typeof options !== 'object') {
    return 0;
  }

  const priceA = toValidNumber(options.priceA);
  const priceB = toValidNumber(options.priceB);

  if (priceA === null || priceB === null) {
    return 0;
  }

  const strategy = options.strategy || HALF_PRICING_STRATEGIES.HIGHEST;
  const extraAmount = toValidNumber(options.extraAmount) ?? 0;

  let unitPrice;

  switch (strategy) {
    case HALF_PRICING_STRATEGIES.AVERAGE:
      unitPrice = (priceA + priceB) / 2;
      break;
    case HALF_PRICING_STRATEGIES.BASE_PLUS:
      unitPrice = Math.max(priceA, priceB) + extraAmount;
      break;
    case HALF_PRICING_STRATEGIES.HIGHEST:
    default:
      unitPrice = Math.max(priceA, priceB);
      break;
  }

  return Number.isFinite(unitPrice) ? unitPrice : 0;
}

export function calculateRegularUnitPrice(price) {
  const validPrice = toValidNumber(price);
  return validPrice === null ? 0 : validPrice;
}

export function calculateOrderItemUnitPrice({
  isHalfAndHalf,
  priceA,
  priceB,
  regularPrice,
  pricingSettings,
} = {}) {
  if (isHalfAndHalf) {
    return calculateHalfAndHalfUnitPrice({
      priceA,
      priceB,
      strategy: pricingSettings?.strategy,
      extraAmount: pricingSettings?.extraAmount,
    });
  }

  return calculateRegularUnitPrice(regularPrice);
}

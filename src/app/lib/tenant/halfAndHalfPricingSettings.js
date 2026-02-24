export const HALF_AND_HALF_PRICING_STRATEGIES = ['HIGHEST', 'AVERAGE', 'BASE_PLUS'];

export const DEFAULT_HALF_AND_HALF_PRICING = {
  strategy: 'HIGHEST',
  extraAmount: 0,
};

const normalizeNumber = (value, fallback = 0) => {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return fallback;
  }
  return numericValue;
};

export function normalizeHalfAndHalfPricing(value) {
  const strategy = HALF_AND_HALF_PRICING_STRATEGIES.includes(value?.strategy)
    ? value.strategy
    : DEFAULT_HALF_AND_HALF_PRICING.strategy;

  const extraAmount = Math.max(0, normalizeNumber(value?.extraAmount, DEFAULT_HALF_AND_HALF_PRICING.extraAmount));

  return {
    strategy,
    extraAmount,
  };
}

export function validateHalfAndHalfPricing(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'halfAndHalfPricing must be an object';
  }

  if (!HALF_AND_HALF_PRICING_STRATEGIES.includes(value.strategy)) {
    return 'strategy must be one of HIGHEST, AVERAGE, BASE_PLUS';
  }

  const extraAmount = Number(value.extraAmount);
  if (!Number.isFinite(extraAmount) || extraAmount < 0) {
    return 'extraAmount must be a number greater than or equal to 0';
  }

  return null;
}

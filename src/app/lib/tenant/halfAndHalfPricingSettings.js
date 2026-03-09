export const HALF_AND_HALF_PRICING_DEFAULT_DESCRIPTION = 'Half And Half Pricing Default';

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

const resolveAllowedStrategies = (allowedStrategies = HALF_AND_HALF_PRICING_STRATEGIES) => {
  const normalized = Array.isArray(allowedStrategies)
    ? allowedStrategies.filter((value) => typeof value === 'string' && value.trim())
    : [];

  return normalized.length ? normalized : HALF_AND_HALF_PRICING_STRATEGIES;
};

export function normalizeHalfAndHalfPricing(value, allowedStrategies = HALF_AND_HALF_PRICING_STRATEGIES) {
  const strategies = resolveAllowedStrategies(allowedStrategies);
  const fallbackStrategy = strategies.includes(DEFAULT_HALF_AND_HALF_PRICING.strategy)
    ? DEFAULT_HALF_AND_HALF_PRICING.strategy
    : strategies[0];

  const strategy = strategies.includes(value?.strategy)
    ? value.strategy
    : fallbackStrategy;

  const extraAmount = Math.max(0, normalizeNumber(value?.extraAmount, DEFAULT_HALF_AND_HALF_PRICING.extraAmount));

  return {
    strategy,
    extraAmount,
  };
}

export function validateHalfAndHalfPricing(value, allowedStrategies = HALF_AND_HALF_PRICING_STRATEGIES) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'halfAndHalfPricing must be an object';
  }

  const strategies = resolveAllowedStrategies(allowedStrategies);
  if (!strategies.includes(value.strategy)) {
    return `strategy must be one of ${strategies.join(', ')}`;
  }

  const extraAmount = Number(value.extraAmount);
  if (!Number.isFinite(extraAmount) || extraAmount < 0) {
    return 'extraAmount must be a number greater than or equal to 0';
  }

  return null;
}

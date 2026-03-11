export const DEFAULT_PRICING_STRATEGY_OPTIONS = [
  { value: 'HIGHEST', labelKey: 'chargeHighestPrice' },
  { value: 'AVERAGE', labelKey: 'chargeAveragePrice' },
  { value: 'BASE_PLUS', labelKey: 'chargeHighestPlusFee' },
];

const normalizeText = (value) =>
  typeof value === 'string' ? value.trim() : '';

const fallbackOptionByValue = DEFAULT_PRICING_STRATEGY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

export function normalizePricingStrategyOptions(value) {
  if (!Array.isArray(value)) {
    return DEFAULT_PRICING_STRATEGY_OPTIONS;
  }

  const seen = new Set();
  const normalized = value
    .map((option) => {
      const optionValue = normalizeText(option?.value);
      if (!optionValue || seen.has(optionValue)) {
        return null;
      }
      seen.add(optionValue);

      const fallback = fallbackOptionByValue[optionValue] || {};
      const labelKey = normalizeText(option?.labelKey) || fallback.labelKey || optionValue;

      return {
        value: optionValue,
        labelKey,
      };
    })
    .filter(Boolean);

  return normalized.length ? normalized : DEFAULT_PRICING_STRATEGY_OPTIONS;
}

export function getPricingStrategyValues(value) {
  return normalizePricingStrategyOptions(value).map((option) => option.value);
}

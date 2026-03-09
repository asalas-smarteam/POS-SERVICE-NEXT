export const PAYMENT_STRATEGY_OPTIONS_DESCRIPTION = 'Payment Strategy Options';

export const DEFAULT_PAYMENT_STRATEGY_OPTIONS = [
  {
    value: 'pay_now',
    labelKey: 'paymentStrategyPayNow',
    descriptionKey: 'paymentStrategyPayNowHelp',
    paymentMode: 'pay_now',
  },
  {
    value: 'pay_after_meal',
    labelKey: 'paymentStrategyPayAfterMeal',
    descriptionKey: 'paymentStrategyPayAfterMealHelp',
    paymentMode: 'pay_later',
  },
  {
    value: 'cashier_choice',
    labelKey: 'paymentStrategyCashierChoice',
    descriptionKey: 'paymentStrategyCashierChoiceHelp',
    paymentMode: 'pay_later',
  },
];

export const PAYMENT_STRATEGIES = DEFAULT_PAYMENT_STRATEGY_OPTIONS.map((option) => option.value);
export const DEFAULT_PAYMENT_STRATEGY = 'pay_after_meal';

const normalizeText = (value) =>
  typeof value === 'string' ? value.trim() : '';

const uniqueByValue = (options) => {
  const seen = new Set();
  return options.filter((option) => {
    if (seen.has(option.value)) {
      return false;
    }
    seen.add(option.value);
    return true;
  });
};

const fallbackOptionByValue = DEFAULT_PAYMENT_STRATEGY_OPTIONS.reduce((acc, option) => {
  acc[option.value] = option;
  return acc;
}, {});

export function normalizePaymentStrategyOptions(value) {
  if (!Array.isArray(value)) {
    return DEFAULT_PAYMENT_STRATEGY_OPTIONS;
  }

  const normalized = value
    .map((option) => {
      const optionValue = normalizeText(option?.value);
      if (!optionValue) {
        return null;
      }

      const fallback = fallbackOptionByValue[optionValue] || {};
      const labelKey = normalizeText(option?.labelKey) || fallback.labelKey || optionValue;
      const descriptionKey = normalizeText(option?.descriptionKey) || fallback.descriptionKey || '';
      const paymentMode = normalizeText(option?.paymentMode) || fallback.paymentMode || 'pay_later';

      return {
        value: optionValue,
        labelKey,
        descriptionKey,
        paymentMode,
      };
    })
    .filter(Boolean);

  const deduped = uniqueByValue(normalized);
  return deduped.length ? deduped : DEFAULT_PAYMENT_STRATEGY_OPTIONS;
}

export function getPaymentStrategies(options = DEFAULT_PAYMENT_STRATEGY_OPTIONS) {
  return normalizePaymentStrategyOptions(options).map((option) => option.value);
}

export function getPaymentModes(options = DEFAULT_PAYMENT_STRATEGY_OPTIONS) {
  const modes = normalizePaymentStrategyOptions(options)
    .map((option) => normalizeText(option.paymentMode))
    .filter(Boolean);

  if (!modes.length) {
    return ['pay_now', 'pay_later'];
  }

  return [...new Set(modes)];
}

export function resolvePaymentModeFromStrategy(
  paymentStrategy,
  options = DEFAULT_PAYMENT_STRATEGY_OPTIONS
) {
  const normalizedOptions = normalizePaymentStrategyOptions(options);
  const selected = normalizedOptions.find((option) => option.value === paymentStrategy);
  if (selected?.paymentMode) {
    return selected.paymentMode;
  }

  const normalizedStrategy = normalizePaymentStrategy(paymentStrategy, normalizedOptions);
  const fallback = normalizedOptions.find((option) => option.value === normalizedStrategy);
  return fallback?.paymentMode || 'pay_later';
}

export function normalizePaymentStrategy(value, options = DEFAULT_PAYMENT_STRATEGY_OPTIONS) {
  const allowedValues = getPaymentStrategies(options);
  return allowedValues.includes(value)
    ? value
    : allowedValues.includes(DEFAULT_PAYMENT_STRATEGY)
      ? DEFAULT_PAYMENT_STRATEGY
      : allowedValues[0] || DEFAULT_PAYMENT_STRATEGY;
}

export function validatePaymentStrategy(value, options = DEFAULT_PAYMENT_STRATEGY_OPTIONS) {
  const allowedValues = getPaymentStrategies(options);
  if (!allowedValues.includes(value)) {
    return `paymentStrategy must be one of ${allowedValues.join(', ')}`;
  }

  return null;
}

export function validatePaymentStrategyOptions(value) {
  if (!Array.isArray(value)) {
    return 'paymentStrategyOptions must be an array';
  }

  const normalized = normalizePaymentStrategyOptions(value);
  if (!normalized.length) {
    return 'paymentStrategyOptions must contain at least one option';
  }

  return null;
}

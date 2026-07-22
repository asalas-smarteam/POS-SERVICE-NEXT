export const DEFAULT_CURRENCY = {
  code: 'CRC',
  symbol: '₡',
  decimals: 0,
};

const normalizeDecimals = (value, fallback) => {
  const numericValue = Number(value);
  if (!Number.isInteger(numericValue) || numericValue < 0 || numericValue > 4) {
    return fallback;
  }
  return numericValue;
};

export function normalizeCurrency(value) {
  const code =
    typeof value?.code === 'string' && value.code.trim()
      ? value.code.trim().toUpperCase()
      : DEFAULT_CURRENCY.code;

  const symbol =
    typeof value?.symbol === 'string' && value.symbol.trim()
      ? value.symbol.trim()
      : DEFAULT_CURRENCY.symbol;

  const decimals = normalizeDecimals(value?.decimals, DEFAULT_CURRENCY.decimals);

  return { code, symbol, decimals };
}

export function validateCurrency(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return 'currency must be an object';
  }

  if (typeof value.code !== 'string' || !value.code.trim()) {
    return 'currency.code must be a non-empty string';
  }

  if (typeof value.symbol !== 'string' || !value.symbol.trim()) {
    return 'currency.symbol must be a non-empty string';
  }

  const decimals = Number(value.decimals);
  if (!Number.isInteger(decimals) || decimals < 0 || decimals > 4) {
    return 'currency.decimals must be an integer between 0 and 4';
  }

  return null;
}

import { DEFAULT_CURRENCY } from "@/lib/tenant/currencySettings";

export function formatCurrencyAmount(amount, currency = DEFAULT_CURRENCY, locale = "es") {
  const { symbol, decimals } = { ...DEFAULT_CURRENCY, ...currency };
  const numericAmount = Number(amount);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

  const formattedNumber = new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(safeAmount);

  return `${symbol}${formattedNumber}`;
}

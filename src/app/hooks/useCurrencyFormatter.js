"use client";

import { useCallback } from "react";
import { useLocale } from "next-intl";
import { useSettingsStore } from "../../store/settingsStore";
import { formatCurrencyAmount } from "@/lib/formatCurrencyAmount";

export function useCurrencyFormatter() {
  const locale = useLocale();
  const currency = useSettingsStore((state) => state.currency);

  const formatCurrency = useCallback(
    (amount) => formatCurrencyAmount(amount, currency, locale),
    [currency, locale]
  );

  return { formatCurrency, currency };
}

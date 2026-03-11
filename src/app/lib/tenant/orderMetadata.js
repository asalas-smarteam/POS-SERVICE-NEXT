import { normalizeOrderTypes } from "@/lib/tenant/orderTypeSettings";
import {
  DEFAULT_PAYMENT_STRATEGY_OPTIONS,
  getPaymentModes,
  resolvePaymentModeFromStrategy,
} from "@/lib/tenant/paymentStrategySettings";
import { getSystemSettings } from "@/lib/tenant/systemSettings";

export const PAYMENT_MODES = getPaymentModes(DEFAULT_PAYMENT_STRATEGY_OPTIONS);

export function normalizePaymentMode(value, fallback = "pay_later", allowedModes = PAYMENT_MODES) {
  const modes = Array.isArray(allowedModes) && allowedModes.length ? allowedModes : PAYMENT_MODES;
  if (modes.includes(value)) {
    return value;
  }
  return modes.includes(fallback) ? fallback : modes[0] || "pay_later";
}

export async function getTenantOrderConfig(conn) {
  const settingsData = await getSystemSettings(conn);
  const paymentStrategyOptions = DEFAULT_PAYMENT_STRATEGY_OPTIONS;

  const orderTypes = normalizeOrderTypes(settingsData.orderTypes);
  const paymentModeDefault = resolvePaymentModeFromStrategy(
    settingsData.paymentStrategy,
    paymentStrategyOptions
  );
  const paymentModeOptions = getPaymentModes(paymentStrategyOptions);

  return {
    orderTypes,
    paymentModeDefault,
    paymentModeOptions,
  };
}

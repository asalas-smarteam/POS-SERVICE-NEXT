import { TenantSettingModel } from "@/models/tenant/TenantSetting";
import { normalizeOrderTypes } from "@/lib/tenant/orderTypeSettings";
import {
  DEFAULT_PAYMENT_STRATEGY_OPTIONS,
  PAYMENT_STRATEGY_OPTIONS_DESCRIPTION,
  getPaymentModes,
  normalizePaymentStrategyOptions,
  resolvePaymentModeFromStrategy,
} from "@/lib/tenant/paymentStrategySettings";

export const PAYMENT_MODES = getPaymentModes(DEFAULT_PAYMENT_STRATEGY_OPTIONS);

export function normalizePaymentMode(value, fallback = "pay_later", allowedModes = PAYMENT_MODES) {
  const modes = Array.isArray(allowedModes) && allowedModes.length ? allowedModes : PAYMENT_MODES;
  if (modes.includes(value)) {
    return value;
  }
  return modes.includes(fallback) ? fallback : modes[0] || "pay_later";
}

export async function getTenantOrderConfig(conn) {
  const TenantSetting = TenantSettingModel(conn);
  const [settings, paymentStrategyOptionsSetting] = await Promise.all([
    TenantSetting.findOne({ description: "Settings" }).lean(),
    TenantSetting.findOne({ description: PAYMENT_STRATEGY_OPTIONS_DESCRIPTION }).lean(),
  ]);
  const settingsData =
    settings?.data && typeof settings.data === "object" && !Array.isArray(settings.data)
      ? settings.data
      : {};
  const paymentStrategyOptions = normalizePaymentStrategyOptions(paymentStrategyOptionsSetting?.data);

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

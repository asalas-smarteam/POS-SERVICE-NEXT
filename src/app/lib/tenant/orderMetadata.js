import { TenantSettingModel } from "@/models/tenant/TenantSetting";
import { normalizeOrderTypes } from "@/lib/tenant/orderTypeSettings";
import { normalizePaymentStrategy } from "@/lib/tenant/paymentStrategySettings";

export const PAYMENT_MODES = ["pay_now", "pay_later"];

export function resolvePaymentModeFromStrategy(paymentStrategy) {
  const normalizedStrategy = normalizePaymentStrategy(paymentStrategy);
  return normalizedStrategy === "pay_now" ? "pay_now" : "pay_later";
}

export function normalizePaymentMode(value, fallback = "pay_later") {
  if (PAYMENT_MODES.includes(value)) {
    return value;
  }
  return PAYMENT_MODES.includes(fallback) ? fallback : "pay_later";
}

export async function getTenantOrderConfig(conn) {
  const TenantSetting = TenantSettingModel(conn);
  const settings = await TenantSetting.findOne({ description: "Settings" }).lean();
  const settingsData =
    settings?.data && typeof settings.data === "object" && !Array.isArray(settings.data)
      ? settings.data
      : {};

  const orderTypes = normalizeOrderTypes(settingsData.orderTypes);
  const paymentModeDefault = resolvePaymentModeFromStrategy(settingsData.paymentStrategy);

  return {
    orderTypes,
    paymentModeDefault,
  };
}

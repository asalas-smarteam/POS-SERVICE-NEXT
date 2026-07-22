import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import { DEFAULT_CURRENCY, normalizeCurrency } from '@/lib/tenant/currencySettings';
import {
  DEFAULT_HALF_AND_HALF_PRICING,
  normalizeHalfAndHalfPricing,
} from '@/lib/tenant/halfAndHalfPricingSettings';
import {
  DEFAULT_PAYMENT_STRATEGY,
  normalizePaymentStrategy,
} from '@/lib/tenant/paymentStrategySettings';
import {
  DEFAULT_ORDER_TYPES,
  normalizeOrderTypes,
} from '@/lib/tenant/orderTypeSettings';

export const TENANT_SETTINGS_DEFAULTS = [
  {
    description: 'Settings',
    data: {
      currency: DEFAULT_CURRENCY,
      halfAndHalfPricing: DEFAULT_HALF_AND_HALF_PRICING,
      paymentStrategy: DEFAULT_PAYMENT_STRATEGY,
      orderTypes: DEFAULT_ORDER_TYPES,
    },
  },
  {
    description: 'Product Category',
    data: [
      { id: 'bebidas', label: 'Bebida', active: true, sizeIds: [] },
      { id: 'plato_fuerte', label: 'Plato Fuerte', active: true, sizeIds: [] },
      { id: 'postres', label: 'Postre', active: true, sizeIds: [] },
    ],
  },
  {
    description: 'Product Sizes',
    data: [
      { id: 'small', label: 'Pequeño', active: true },
      { id: 'medium', label: 'Mediano', active: true },
      { id: 'large', label: 'Grande', active: true },
    ],
  },
  {
    description: 'Units',
    data: {
      ingredients: [
        { id: 'unit', label: 'Unidad' },
        { id: 'g', label: 'Gramos' },
        { id: 'kg', label: 'Kilos' },
      ],
      products: [{ id: 'unit', label: 'Unidad' }],
    },
  },
];

const cloneData = (value) => JSON.parse(JSON.stringify(value));

export async function ensureDefaultSettings(conn) {
  const TenantSetting = TenantSettingModel(conn);

  await Promise.all(
    TENANT_SETTINGS_DEFAULTS.map((setting) =>
      TenantSetting.updateOne(
        { description: setting.description },
        {
          $setOnInsert: {
            description: setting.description,
            data: cloneData(setting.data),
          },
        },
        { upsert: true }
      )
    )
  );

  const settings = await TenantSetting.find().sort({ createdAt: 1 });

  const normalizedSettings = await Promise.all(
    settings.map(async (setting) => {
      const normalized = enforceSettingsDefaults(setting);
      if (normalized?.isModified?.()) {
        await normalized.save();
      }
      return normalized;
    })
  );

  return normalizedSettings;
}


function enforceSettingsDefaults(setting) {
  if (!setting) {
    return setting;
  }

  if (setting.description !== 'Settings') {
    return setting;
  }

  const currentData =
    setting.data && typeof setting.data === 'object' && !Array.isArray(setting.data)
      ? setting.data
      : {};

  const nextData = {
    ...currentData,
    currency: normalizeCurrency(currentData.currency),
    halfAndHalfPricing: normalizeHalfAndHalfPricing(currentData.halfAndHalfPricing),
    paymentStrategy: normalizePaymentStrategy(currentData.paymentStrategy),
    orderTypes: normalizeOrderTypes(currentData.orderTypes),
  };

  setting.data = nextData;
  return setting;
}

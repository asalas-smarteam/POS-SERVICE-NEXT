import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import {
  DEFAULT_HALF_AND_HALF_PRICING,
  normalizeHalfAndHalfPricing,
} from '@/lib/tenant/halfAndHalfPricingSettings';
import {
  DEFAULT_PAYMENT_STRATEGY,
  normalizePaymentStrategy,
} from '@/lib/tenant/paymentStrategySettings';

export const TENANT_SETTINGS_DEFAULTS = [
  {
    description: 'Settings',
    data: {
      currency: {
        code: 'CRC',
        symbol: '₡',
        decimals: 0,
      },
      halfAndHalfPricing: DEFAULT_HALF_AND_HALF_PRICING,
      paymentStrategy: DEFAULT_PAYMENT_STRATEGY,
    },
  },
  {
    description: 'Product Category',
    data: [
      { id: 'bebidas', label: 'Bebida', active: true },
      { id: 'plato_fuerte', label: 'Plato Fuerte', active: true },
      { id: 'postres', label: 'Postre', active: true },
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
  if (!setting || setting.description !== 'Settings') {
    return setting;
  }

  const currentData =
    setting.data && typeof setting.data === 'object' && !Array.isArray(setting.data)
      ? setting.data
      : {};

  const nextData = {
    ...currentData,
    halfAndHalfPricing: normalizeHalfAndHalfPricing(currentData.halfAndHalfPricing),
    paymentStrategy: normalizePaymentStrategy(currentData.paymentStrategy),
  };

  setting.data = nextData;
  return setting;
}

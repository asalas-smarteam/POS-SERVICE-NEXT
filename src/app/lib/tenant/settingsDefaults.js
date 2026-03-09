import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import {
  DEFAULT_HALF_AND_HALF_PRICING,
  normalizeHalfAndHalfPricing,
  HALF_AND_HALF_PRICING_DEFAULT_DESCRIPTION,
} from '@/lib/tenant/halfAndHalfPricingSettings';
import {
  DEFAULT_PAYMENT_STRATEGY,
  normalizePaymentStrategy,
  DEFAULT_PAYMENT_STRATEGY_OPTIONS,
  PAYMENT_STRATEGY_OPTIONS_DESCRIPTION,
  normalizePaymentStrategyOptions,
} from '@/lib/tenant/paymentStrategySettings';
import {
  DEFAULT_ORDER_TYPES,
  normalizeOrderTypes,
} from '@/lib/tenant/orderTypeSettings';
import {
  DEFAULT_PRICING_STRATEGY_OPTIONS,
  normalizePricingStrategyOptions,
  PRICING_STRATEGY_OPTIONS_DESCRIPTION,
} from '@/lib/tenant/pricingStrategySettings';

export const TENANT_SETTINGS_DEFAULTS = [
  {
    description: PRICING_STRATEGY_OPTIONS_DESCRIPTION,
    data: DEFAULT_PRICING_STRATEGY_OPTIONS,
  },
  {
    description: HALF_AND_HALF_PRICING_DEFAULT_DESCRIPTION,
    data: DEFAULT_HALF_AND_HALF_PRICING,
  },
  {
    description: PAYMENT_STRATEGY_OPTIONS_DESCRIPTION,
    data: DEFAULT_PAYMENT_STRATEGY_OPTIONS,
  },
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
      orderTypes: DEFAULT_ORDER_TYPES,
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

  const pricingStrategySetting = settings.find(
    (setting) => setting?.description === PRICING_STRATEGY_OPTIONS_DESCRIPTION
  );
  const paymentStrategyOptionsSetting = settings.find(
    (setting) => setting?.description === PAYMENT_STRATEGY_OPTIONS_DESCRIPTION
  );

  const pricingStrategyValues = normalizePricingStrategyOptions(pricingStrategySetting?.data).map(
    (option) => option.value
  );
  const paymentStrategyOptions = normalizePaymentStrategyOptions(paymentStrategyOptionsSetting?.data);

  const normalizedSettings = await Promise.all(
    settings.map(async (setting) => {
      const normalized = enforceSettingsDefaults(setting, {
        pricingStrategyValues,
        paymentStrategyOptions,
      });
      if (normalized?.isModified?.()) {
        await normalized.save();
      }
      return normalized;
    })
  );

  return normalizedSettings;
}


function enforceSettingsDefaults(setting, context = {}) {
  if (!setting) {
    return setting;
  }

  const pricingStrategyValues = Array.isArray(context.pricingStrategyValues)
    ? context.pricingStrategyValues
    : undefined;
  const paymentStrategyOptions = Array.isArray(context.paymentStrategyOptions)
    ? context.paymentStrategyOptions
    : undefined;

  if (setting.description === PRICING_STRATEGY_OPTIONS_DESCRIPTION) {
    setting.data = normalizePricingStrategyOptions(setting.data);
    return setting;
  }

  if (setting.description === HALF_AND_HALF_PRICING_DEFAULT_DESCRIPTION) {
    setting.data = normalizeHalfAndHalfPricing(setting.data, pricingStrategyValues);
    return setting;
  }

  if (setting.description === PAYMENT_STRATEGY_OPTIONS_DESCRIPTION) {
    setting.data = normalizePaymentStrategyOptions(setting.data);
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
    halfAndHalfPricing: normalizeHalfAndHalfPricing(currentData.halfAndHalfPricing, pricingStrategyValues),
    paymentStrategy: normalizePaymentStrategy(currentData.paymentStrategy, paymentStrategyOptions),
    orderTypes: normalizeOrderTypes(currentData.orderTypes),
  };

  setting.data = nextData;
  return setting;
}

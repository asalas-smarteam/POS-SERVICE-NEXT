import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { authorizeRequest } from '@/lib/security/authorizeRequest';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import {
  HALF_AND_HALF_PRICING_DEFAULT_DESCRIPTION,
  validateHalfAndHalfPricing,
  normalizeHalfAndHalfPricing,
} from '@/lib/tenant/halfAndHalfPricingSettings';
import {
  PAYMENT_STRATEGY_OPTIONS_DESCRIPTION,
  validatePaymentStrategy,
  normalizePaymentStrategy,
  normalizePaymentStrategyOptions,
  validatePaymentStrategyOptions,
} from '@/lib/tenant/paymentStrategySettings';
import {
  validateOrderTypes,
  normalizeOrderTypes,
} from '@/lib/tenant/orderTypeSettings';
import {
  PRICING_STRATEGY_OPTIONS_DESCRIPTION,
  validatePricingStrategyOptions,
  normalizePricingStrategyOptions,
} from '@/lib/tenant/pricingStrategySettings';

const isPlainObject = (value) =>
  Object.prototype.toString.call(value) === '[object Object]';

export async function PUT(req, { params }) {
  try {
    const { id: id } = await params;
    
    if (!id) {
      return NextResponse.json({ error: 'Invalid id' }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, 'settings');
    const conn = await getTenantConnection(tenant.dbName);
    const TenantSetting = TenantSettingModel(conn);

    const existing = await TenantSetting.findById(id);
    if (!existing) {
      return NextResponse.json({ error: 'Setting not found' }, { status: 404 });
    }

    const body = await req.json();
    if (!Object.prototype.hasOwnProperty.call(body, 'data')) {
      return NextResponse.json({ error: 'data is required' }, { status: 400 });
    }

    const nextData = body.data;
    if (!Array.isArray(nextData) && !isPlainObject(nextData)) {
      return NextResponse.json(
        { error: 'data must be an object or an array' },
        { status: 400 }
      );
    }

    if (Array.isArray(existing.data) && !Array.isArray(nextData)) {
      return NextResponse.json(
        { error: 'data must remain an array for this setting' },
        { status: 400 }
      );
    }

    if (isPlainObject(existing.data) && !isPlainObject(nextData)) {
      return NextResponse.json(
        { error: 'data must remain an object for this setting' },
        { status: 400 }
      );
    }

    const [pricingStrategyOptionsSetting, paymentStrategyOptionsSetting] = await Promise.all([
      TenantSetting.findOne({ description: PRICING_STRATEGY_OPTIONS_DESCRIPTION }).lean(),
      TenantSetting.findOne({ description: PAYMENT_STRATEGY_OPTIONS_DESCRIPTION }).lean(),
    ]);
    const pricingStrategies = normalizePricingStrategyOptions(pricingStrategyOptionsSetting?.data).map(
      (option) => option.value
    );
    const paymentStrategyOptions = normalizePaymentStrategyOptions(paymentStrategyOptionsSetting?.data);

    if (existing.description === 'Settings') {
      const currentSettingsData = isPlainObject(existing.data) ? existing.data : {};
      const hasHalfAndHalfPricing =
        isPlainObject(nextData) &&
        Object.prototype.hasOwnProperty.call(nextData, 'halfAndHalfPricing');
      const hasPaymentStrategy =
        isPlainObject(nextData) &&
        Object.prototype.hasOwnProperty.call(nextData, 'paymentStrategy');
      const hasOrderTypes =
        isPlainObject(nextData) &&
        Object.prototype.hasOwnProperty.call(nextData, 'orderTypes');

      if (hasHalfAndHalfPricing) {
        const validationError = validateHalfAndHalfPricing(nextData.halfAndHalfPricing, pricingStrategies);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
      }

      if (hasPaymentStrategy) {
        const validationError = validatePaymentStrategy(nextData.paymentStrategy, paymentStrategyOptions);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
      }

      if (hasOrderTypes) {
        const validationError = validateOrderTypes(nextData.orderTypes);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
      }

      if (isPlainObject(nextData)) {
        nextData.halfAndHalfPricing = normalizeHalfAndHalfPricing(
          hasHalfAndHalfPricing
            ? nextData.halfAndHalfPricing
            : currentSettingsData.halfAndHalfPricing,
          pricingStrategies
        );
        nextData.paymentStrategy = normalizePaymentStrategy(
          hasPaymentStrategy
            ? nextData.paymentStrategy
            : currentSettingsData.paymentStrategy,
          paymentStrategyOptions
        );
        nextData.orderTypes = normalizeOrderTypes(
          hasOrderTypes
            ? nextData.orderTypes
            : currentSettingsData.orderTypes
        );
      }
    }

    if (existing.description === HALF_AND_HALF_PRICING_DEFAULT_DESCRIPTION) {
      const validationError = validateHalfAndHalfPricing(nextData, pricingStrategies);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      existing.data = normalizeHalfAndHalfPricing(nextData, pricingStrategies);
      await existing.save();
      return NextResponse.json(existing);
    }

    if (existing.description === PRICING_STRATEGY_OPTIONS_DESCRIPTION) {
      const validationError = validatePricingStrategyOptions(nextData);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      existing.data = normalizePricingStrategyOptions(nextData);
      await existing.save();
      return NextResponse.json(existing);
    }

    if (existing.description === PAYMENT_STRATEGY_OPTIONS_DESCRIPTION) {
      const validationError = validatePaymentStrategyOptions(nextData);
      if (validationError) {
        return NextResponse.json({ error: validationError }, { status: 400 });
      }
      existing.data = normalizePaymentStrategyOptions(nextData);
      await existing.save();
      return NextResponse.json(existing);
    }

    existing.data = nextData;
    await existing.save();

    return NextResponse.json(existing);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

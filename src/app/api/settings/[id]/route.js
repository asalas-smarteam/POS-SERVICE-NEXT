import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { authorizeRequest } from '@/lib/security/authorizeRequest';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import {
  validateHalfAndHalfPricing,
  normalizeHalfAndHalfPricing,
} from '@/lib/tenant/halfAndHalfPricingSettings';
import {
  validatePaymentStrategy,
  normalizePaymentStrategy,
} from '@/lib/tenant/paymentStrategySettings';

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

    if (existing.description === 'Settings') {
      const currentSettingsData = isPlainObject(existing.data) ? existing.data : {};
      const hasHalfAndHalfPricing =
        isPlainObject(nextData) &&
        Object.prototype.hasOwnProperty.call(nextData, 'halfAndHalfPricing');
      const hasPaymentStrategy =
        isPlainObject(nextData) &&
        Object.prototype.hasOwnProperty.call(nextData, 'paymentStrategy');

      if (hasHalfAndHalfPricing) {
        const validationError = validateHalfAndHalfPricing(nextData.halfAndHalfPricing);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
      }

      if (hasPaymentStrategy) {
        const validationError = validatePaymentStrategy(nextData.paymentStrategy);
        if (validationError) {
          return NextResponse.json({ error: validationError }, { status: 400 });
        }
      }

      if (isPlainObject(nextData)) {
        nextData.halfAndHalfPricing = normalizeHalfAndHalfPricing(
          hasHalfAndHalfPricing
            ? nextData.halfAndHalfPricing
            : currentSettingsData.halfAndHalfPricing
        );
        nextData.paymentStrategy = normalizePaymentStrategy(
          hasPaymentStrategy
            ? nextData.paymentStrategy
            : currentSettingsData.paymentStrategy
        );
      }
    }

    existing.data = nextData;
    await existing.save();

    return NextResponse.json(existing);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

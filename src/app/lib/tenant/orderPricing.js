import { ProductModel } from '@/models/tenant/Product';
import { TenantSettingModel } from '@/models/tenant/TenantSetting';
import { calculateOrderItemUnitPrice } from '../../../../lib/pricing/halfAndHalfPricing';
import {
  DEFAULT_HALF_AND_HALF_PRICING,
  normalizeHalfAndHalfPricing,
} from '@/lib/tenant/halfAndHalfPricingSettings';

function toObjectIdString(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && typeof value.toString === 'function') {
    return value.toString();
  }
  return String(value);
}

function toSafeNumber(value, fallback = 0) {
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : fallback;
}

function normalizeStringArray(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === 'string' ? entry.trim() : ''))
    .filter(Boolean);
}

export async function getTenantHalfAndHalfPricing(conn) {
  const TenantSetting = TenantSettingModel(conn);

  const settings = await TenantSetting.findOne({ description: 'Settings' }).lean();

  return normalizeHalfAndHalfPricing(
    settings?.data?.halfAndHalfPricing || DEFAULT_HALF_AND_HALF_PRICING,
  );
}

export async function calculateAndBuildOrderItem(conn, itemInput) {
  const Product = ProductModel(conn);

  const productA = await Product.findById(itemInput?.productId).lean();
  if (!productA) {
    return { error: 'Main product not found', status: 400 };
  }

  const isHalfAndHalf = Boolean(itemInput?.isHalfAndHalf);
  let productB = null;

  if (isHalfAndHalf) {
    const halfProductId = itemInput?.halves?.[0]?.productId;
    if (!halfProductId) {
      return { error: 'Half-and-half requires a second product', status: 400 };
    }

    productB = await Product.findById(halfProductId).lean();
    if (!productB) {
      return { error: 'Half-and-half second product not found', status: 400 };
    }

    if (!productA.allowsHalf) {
      return { error: 'Main product does not allow half-and-half', status: 400 };
    }

    if (!productB.allowsHalf) {
      return { error: 'Second product does not allow half-and-half', status: 400 };
    }

    if (toObjectIdString(productA.sizeId) !== toObjectIdString(productB.sizeId)) {
      return { error: 'Both half-and-half products must have the same size', status: 400 };
    }

    if (toObjectIdString(productA._id) === toObjectIdString(productB._id)) {
      return { error: 'Half-and-half products must be different', status: 400 };
    }
  }

  const pricingSettings = await getTenantHalfAndHalfPricing(conn);
  const unitPrice = calculateOrderItemUnitPrice({
    isHalfAndHalf,
    priceA: toSafeNumber(productA.price),
    priceB: toSafeNumber(productB?.price),
    regularPrice: toSafeNumber(productA.price),
    pricingSettings,
  });

  const quantity = Math.max(1, toSafeNumber(itemInput?.quantity, 1));
  const totalPrice = unitPrice * quantity;

  const normalizedHalves = isHalfAndHalf && productB
    ? [{
        ...itemInput.halves?.[0],
        productId: productB._id,
        productName: productB.name,
      }]
    : [];

  const normalizedItem = {
    ...itemInput,
    productId: productA._id,
    productName: productA.name,
    isHalfAndHalf,
    halves: normalizedHalves,
    halfAndHalfDisplayName:
      isHalfAndHalf && productB ? `Half ${productA.name} /Half ${productB.name}` : '',
    quantity,
    price: unitPrice,
    unitPrice,
    totalPrice,
    modifierNotes: normalizeStringArray(itemInput?.modifierNotes || itemInput?.notes),
    note: typeof itemInput?.note === 'string' ? itemInput.note.trim() : '',
  };

  return { item: normalizedItem };
}

export function recalculateOrderTotals(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  let total = 0;

  for (const item of items) {
    const quantity = Math.max(1, toSafeNumber(item?.quantity, 1));
    const unitPrice = toSafeNumber(item?.unitPrice, toSafeNumber(item?.price, 0));
    const totalPrice = unitPrice * quantity;

    item.quantity = quantity;
    item.price = unitPrice;
    item.unitPrice = unitPrice;
    item.totalPrice = totalPrice;

    total += totalPrice;
  }

  order.total = total;
  return total;
}

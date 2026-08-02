import { randomUUID } from 'crypto';
import { ProductModel } from '@/models/tenant/Product';
import { calculateOrderItemUnitPrice } from '@/lib/pricing/halfAndHalfPricing';
import {
  DEFAULT_HALF_AND_HALF_PRICING,
  normalizeHalfAndHalfPricing,
} from '@/lib/tenant/halfAndHalfPricingSettings';
import { getSystemSettings } from '@/lib/tenant/systemSettings';
import { getProductCategoryMap } from '@/lib/tenant/categorySettings';
import { resolveRequiresKitchen } from '@/lib/tenant/kitchenRouting';

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
  const settings = await getSystemSettings(conn);

  return normalizeHalfAndHalfPricing(
    settings?.halfAndHalfPricing || DEFAULT_HALF_AND_HALF_PRICING,
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

    if ((productA.productSizeId || null) !== (productB.productSizeId || null)) {
      return { error: 'Both half-and-half products must have the same portion', status: 400 };
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

  // Ruteo a cocina: se resuelve en el servidor (el cliente solo lo usa para la
  // previsualizacion del ticket) a partir del producto y su categoria.
  const categoryMap = await getProductCategoryMap(conn);
  const requiresKitchen = resolveRequiresKitchen(
    productA,
    categoryMap.get(String(productA.categoryId ?? '')),
  );

  // Cobro parcial: nunca mas unidades pagadas que unidades de la linea (el
  // cajero pudo bajar la cantidad despues de un cobro parcial). Las lineas
  // anteriores a esta funcion solo traen `settled`, asi que ahi se asume que
  // se pago la cantidad completa.
  const incomingPaidQuantity =
    itemInput?.paidQuantity === undefined || itemInput?.paidQuantity === null
      ? (itemInput?.settled ? quantity : 0)
      : toSafeNumber(itemInput.paidQuantity, 0);
  const paidQuantity = Math.min(quantity, Math.max(0, incomingPaidQuantity));

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
    requiresKitchen,
    // Split bill: id estable de linea + asignacion a sub-cuenta + estado de pago.
    // Se preservan si vienen del cliente (round-trip del PUT); si no, se generan.
    lineId: itemInput?.lineId ? String(itemInput.lineId) : randomUUID(),
    accountId: itemInput?.accountId ?? null,
    paidQuantity,
    settled: paidQuantity >= quantity && paidQuantity > 0,
    settledAt:
      paidQuantity >= quantity && paidQuantity > 0
        ? (itemInput?.settledAt ?? new Date())
        : null,
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

    // El cobro parcial vive en paidQuantity, nunca codificado en quantity /
    // totalPrice (que se reescriben aqui). Solo hay que reclamparlo. Lineas
    // viejas sin paidQuantity pero con settled cuentan como pagadas completas.
    const rawPaidQuantity =
      item?.paidQuantity === undefined || item?.paidQuantity === null
        ? (item?.settled ? quantity : 0)
        : toSafeNumber(item.paidQuantity, 0);
    const paidQuantity = Math.min(quantity, Math.max(0, rawPaidQuantity));
    item.paidQuantity = paidQuantity;
    item.settled = paidQuantity > 0 && paidQuantity >= quantity;
    if (!item.settled) {
      item.settledAt = null;
    }

    total += totalPrice;
  }

  order.total = total;
  return total;
}

// Logica de pagos / division de cuenta (split bill). Trabaja sobre un documento
// Order de Mongoose ya cargado (mutandolo) y deja el saldo consistente.

const SHARED = 'shared';

export function toSafeNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function round2(value) {
  return Math.round((toSafeNumber(value) + Number.EPSILON) * 100) / 100;
}

function isShared(accountId) {
  return !accountId || accountId === SHARED;
}

// Recalcula amountPaid / paymentStatus a partir de payments[] y total.
export function recomputePaymentState(order) {
  const total = round2(order?.total);
  const amountPaid = round2(
    (order?.payments || []).reduce((sum, p) => sum + toSafeNumber(p?.amount), 0)
  );

  order.amountPaid = amountPaid;
  order.paymentStatus =
    amountPaid <= 0 ? 'unpaid' : amountPaid >= total - 0.005 ? 'paid' : 'partial';

  return {
    amountPaid,
    amountDue: round2(Math.max(0, total - amountPaid)),
    paymentStatus: order.paymentStatus,
  };
}

export function getAmountDue(order) {
  return round2(Math.max(0, round2(order?.total) - round2(order?.amountPaid)));
}

// ----- Cobro parcial por cantidad -----
// Una linea puede quedar cobrada a medias (2 de 10 Coca Colas): `paidQuantity`
// lleva las unidades ya cobradas y `settled` significa "cubierta por completo".
// El saldo en dinero NUNCA sale de aqui (sale de payments[]); esto solo define
// que unidades siguen pendientes de cobro.

export function getUnitPrice(item) {
  return toSafeNumber(item?.unitPrice, toSafeNumber(item?.price, 0));
}

export function getRemainingQuantity(item) {
  const quantity = Math.max(0, toSafeNumber(item?.quantity, 0));
  // Lineas anteriores a paidQuantity solo traen `settled`.
  const paidQuantity =
    item?.paidQuantity === undefined || item?.paidQuantity === null
      ? (item?.settled ? quantity : 0)
      : Math.max(0, toSafeNumber(item.paidQuantity, 0));
  return Math.max(0, quantity - paidQuantity);
}

export function getRemainingAmount(item) {
  return round2(getRemainingQuantity(item) * getUnitPrice(item));
}

export function hasPendingUnits(item) {
  return getRemainingQuantity(item) > 0;
}

// Normaliza la seleccion del cliente a Map<lineId, unidades>, clampeando cada
// cantidad a las unidades que quedan pendientes en esa linea. Acepta la forma
// nueva [{ lineId, quantity }] y la vieja ['lineId', ...] (= todo lo pendiente).
export function normalizeLineSelection(order, selections = []) {
  const itemsByLineId = new Map(
    (order?.items || [])
      .filter((it) => it.lineId)
      .map((it) => [String(it.lineId), it]),
  );

  const normalized = new Map();
  for (const entry of Array.isArray(selections) ? selections : []) {
    const lineId = String(
      typeof entry === 'object' && entry !== null ? (entry.lineId ?? '') : entry,
    );
    const item = itemsByLineId.get(lineId);
    if (!item) continue;

    const remaining = getRemainingQuantity(item);
    if (remaining <= 0) continue;

    const requested =
      typeof entry === 'object' && entry !== null && entry.quantity !== undefined
        ? Math.floor(toSafeNumber(entry.quantity, 0))
        : remaining;
    // Acumula si el mismo lineId viene repetido, sin pasarse del pendiente.
    const already = normalized.get(lineId) ?? 0;
    const quantity = Math.min(remaining, Math.max(0, already + requested));
    if (quantity > 0) {
      normalized.set(lineId, quantity);
    }
  }

  return normalized;
}

// Subtotales por sub-cuenta (solo lineas NO asentadas) + bucket Compartido.
export function getAccountBreakdown(order) {
  const items = Array.isArray(order?.items) ? order.items : [];
  const subAccounts = Array.isArray(order?.subAccounts) ? order.subAccounts : [];

  const ownSubtotal = (accountId) =>
    round2(
      items
        .filter((it) => hasPendingUnits(it) && String(it.accountId || '') === String(accountId))
        .reduce((s, it) => s + getRemainingAmount(it), 0)
    );

  const sharedSubtotal = round2(
    items
      .filter((it) => hasPendingUnits(it) && isShared(it.accountId))
      .reduce((s, it) => s + getRemainingAmount(it), 0)
  );

  const accounts = subAccounts.map((acc) => ({
    id: acc.id,
    name: acc.name,
    isPaid: Boolean(acc.isPaid),
    subtotal: ownSubtotal(acc.id),
  }));

  const perAccountShare = round2(sharedSubtotal / Math.max(1, accounts.length));

  return { accounts, shared: { subtotal: sharedSubtotal, perAccountShare } };
}

// Asienta (cobra) las unidades seleccionadas: suma a paidQuantity y marca
// `settled` solo cuando la linea queda cubierta por completo. Recibe la misma
// forma que normalizeLineSelection.
export function settleLines(order, selections = []) {
  const selection = normalizeLineSelection(order, selections);
  const now = new Date();
  let settledSum = 0;

  for (const item of order.items || []) {
    const quantity = selection.get(String(item.lineId));
    if (!quantity) continue;

    item.paidQuantity = Math.max(0, toSafeNumber(item.paidQuantity, 0)) + quantity;
    settledSum += quantity * getUnitPrice(item);

    if (item.paidQuantity >= Math.max(0, toSafeNumber(item.quantity, 0))) {
      item.settled = true;
      item.settledAt = now;
    }
  }

  return round2(settledSum);
}

// Suma el importe de las unidades pendientes seleccionadas.
export function sumLines(order, selections = []) {
  const selection = normalizeLineSelection(order, selections);
  let total = 0;

  for (const item of order.items || []) {
    const quantity = selection.get(String(item.lineId));
    if (!quantity) continue;
    total += quantity * getUnitPrice(item);
  }

  return round2(total);
}

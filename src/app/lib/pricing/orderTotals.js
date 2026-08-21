// Totales del carrito. Vive en un solo lugar para que la barra movil de
// "abrir detalle" y el panel de la orden nunca muestren cifras distintas.
export const DEFAULT_TAX_RATE = 0.08;

export function calculateOrderTotals({
  subtotal = 0,
  taxRate = DEFAULT_TAX_RATE,
  discount = 0,
} = {}) {
  const safeSubtotal = Number(subtotal) || 0;
  const safeDiscount = Number(discount) || 0;
  const tax = safeSubtotal * (Number(taxRate) || 0);

  return {
    subtotal: safeSubtotal,
    tax,
    discount: safeDiscount,
    total: safeSubtotal + tax - safeDiscount,
  };
}

export function countOrderItems(items = []) {
  return (Array.isArray(items) ? items : []).reduce(
    (count, item) => count + (Number(item?.quantity) || 1),
    0
  );
}

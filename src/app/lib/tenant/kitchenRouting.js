// Kitchen routing: decides which products need to be prepared by the kitchen.
//
// Like Toast / Square / Lightspeed, routing is configured on the data, not
// decided by the cashier on every sale: each category of the "Product
// Category" tenant setting carries a `requiresKitchen` flag, and a product can
// override it (`INHERIT` | `YES` | `NO`). The cashier only gets a final
// override checkbox at checkout, for the "don't fire this one" case.
//
// Pure/isomorphic on purpose: client components (cart, kitchen ticket) import
// this too, so it must stay free of any mongoose import. The server-side
// setting reader lives in lib/tenant/categorySettings.js.

// A category without the flag (rows created before this feature) counts as
// requiring kitchen, so existing tenants keep their current behaviour until an
// admin unchecks something.
export function categoryRequiresKitchen(category) {
  return category?.requiresKitchen !== false;
}

export function resolveRequiresKitchen(product, category) {
  const override = product?.requiresKitchen;
  if (override === 'YES') return true;
  if (override === 'NO') return false;
  return categoryRequiresKitchen(category);
}

// Order items carry the resolved boolean (see OrderItemSchema). Unknown/legacy
// items default to true for the same backwards-compatibility reason.
export function itemRequiresKitchen(item) {
  return item?.requiresKitchen !== false;
}

// Splits a list of order items into the ones the kitchen has to prepare and
// the rest (drinks, packaged goods). Used by the kitchen ticket, which lists
// both but keeps them in separate blocks.
export function splitItemsByKitchen(items = []) {
  const list = Array.isArray(items) ? items : [];
  return {
    kitchenItems: list.filter((item) => itemRequiresKitchen(item)),
    otherItems: list.filter((item) => !itemRequiresKitchen(item)),
  };
}

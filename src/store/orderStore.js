import { create } from "./zustand";

const resolveProductId = (product) =>
  product?._id ?? product?.id ?? product?.sku ?? product?.name;

const normalizePrice = (price) => Number(price ?? 0);

const normalizeNotes = (notes) => {
  if (Array.isArray(notes)) {
    return notes.filter(Boolean);
  }
  if (typeof notes === "string" && notes.trim()) {
    return [notes.trim()];
  }
  return [];
};

const normalizeIngredients = (ingredients = []) =>
  ingredients
    .map((item) => {
      const ingredient = item?.ingredientId ?? {};
      const ingredientId = ingredient?._id ?? item?.ingredientId;
      if (!ingredientId) {
        return null;
      }
      return {
        ingredientId,
        name: ingredient?.name ?? item?.name ?? "Ingrediente",
        quantity: Number(item?.quantity ?? 1),
      };
    })
    .filter(Boolean);

const normalizeOrderItem = (item = {}, index = 0) => {
  const productId =
    item?.productId?._id ??
    item?.productId ??
    item?.id ??
    `item-${index}`;

  // A single order can hold several lines for the same product (the API always
  // appends, never merges), so the React/line identifier must be the line's own
  // subdocument id, not the productId, to stay unique.
  const lineId = item?._id ?? item?.id ?? `${productId}-${index}`;

  const normalizedQuantity = Math.max(1, Number(item?.quantity ?? 1));
  const normalizedPrice = Number(item?.unitPrice ?? item?.price ?? 0);

  const rawModifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];
  const normalizedModifiers = rawModifiers
    .map((modifier) => {
      const ingredientId =
        modifier?.ingredientId?._id ?? modifier?.ingredientId ?? null;
      if (!ingredientId) {
        return null;
      }
      return {
        ingredientId,
        name: modifier?.name ?? "Ingrediente",
        quantity: Number(modifier?.quantity ?? 0),
        baseQuantity: Number(modifier?.baseQuantity ?? 0),
        isExtra: Boolean(modifier?.isExtra),
      };
    })
    .filter(Boolean);

  return {
    id: String(lineId),
    productId: String(productId),
    name: item?.productName ?? item?.name ?? "Producto",
    price: normalizedPrice,
    basePrice: normalizedPrice,
    notes: normalizeNotes(item?.notes),
    modifierNotes: normalizeNotes(item?.modifierNotes),
    note: typeof item?.note === "string" ? item.note : "",
    quantity: normalizedQuantity,
    allowsHalf: Boolean(item?.isHalfAndHalf),
    sizeId: item?.sizeId ?? null,
    categoryId: item?.categoryId ?? null,
    isHalfAndHalf: Boolean(item?.isHalfAndHalf),
    halves: Array.isArray(item?.halves) ? item.halves : [],
    baseIngredients: normalizeIngredients(item?.modifiers ?? []),
    modifiers: normalizedModifiers,
    persistedQuantity: normalizedQuantity,
    fromPersistedOrder: true,
  };
};

// Deterministic signature of the cart's persistable content, used to detect
// unsaved changes against the persisted order (adds, removals, quantity and
// note/modifier edits all change it).
export const buildOrderItemsSignature = (items = []) => {
  const lines = (Array.isArray(items) ? items : []).map((item) => {
    const modifiers = (Array.isArray(item?.modifiers) ? item.modifiers : [])
      .map((modifier) => `${String(modifier?.ingredientId ?? "")}:${Number(modifier?.quantity ?? 0)}`)
      .sort();
    const halves = (Array.isArray(item?.halves) ? item.halves : [])
      .map((half) => String(half?.productId ?? ""))
      .sort();
    const modifierNotes = (Array.isArray(item?.modifierNotes) ? item.modifierNotes : [])
      .filter(Boolean)
      .map((note) => String(note))
      .sort();
    return [
      String(item?.productId ?? item?.id ?? ""),
      Number(item?.quantity ?? 0),
      item?.isHalfAndHalf ? 1 : 0,
      typeof item?.note === "string" ? item.note.trim() : "",
      halves.join(","),
      modifiers.join(","),
      modifierNotes.join(","),
    ].join("|");
  });
  lines.sort();
  return lines.join(";;");
};

export const useOrderStore = create((set, get) => ({
  items: [],
  customerName: "",
  editingOrder: null,
  setCustomerName: (customerName) =>
    set({ customerName: typeof customerName === "string" ? customerName : "" }),
  hydrateOrder: (order) => {
    if (!order) {
      return;
    }

    const orderId = order?._id ?? order?.id;
    const items = Array.isArray(order?.items) ? order.items : [];
    const normalizedItems = items.map((item, index) => normalizeOrderItem(item, index));

    set({
      items: normalizedItems,
      customerName: typeof order?.customerName === "string" ? order.customerName : "",
      editingOrder: {
        orderId: orderId ? String(orderId) : "",
        orderType: order?.orderType ?? "takeaway",
        tableId: order?.tableId ?? "",
        tableLabel: order?.tableLabel ?? "",
        itemsSignature: buildOrderItemsSignature(normalizedItems),
      },
    });
  },
  clearEditingOrder: () => set({ editingOrder: null }),
  addItem: (product) => {
    const productId = resolveProductId(product);
    if (!product || !productId) {
      return;
    }

    set((state) => {
      // Merge into an existing plain line for the same product. Matching by
      // productId (not the line id) means adding a product already present in a
      // hydrated order increments that line instead of creating a duplicate.
      const existing = state.items.find(
        (item) => String(item.productId) === String(productId) && !item.isHalfAndHalf
      );
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === existing.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }
      const baseIngredients = normalizeIngredients(product?.ingredients ?? []);
      return {
        items: [
          ...state.items,
          {
            id: productId,
            productId,
            name: product.name ?? "Producto",
            price: normalizePrice(product.price),
            basePrice: normalizePrice(product.price),
            notes: normalizeNotes(product.notes),
            modifierNotes: [],
            note: "",
            quantity: 1,
            allowsHalf: Boolean(product?.allowsHalf),
            sizeId: product?.sizeId ?? null,
            categoryId: product?.categoryId ?? null,
            isHalfAndHalf: false,
            halves: [],
            baseIngredients,
            // modifiers mantiene cantidades base y extras por ingrediente.
            modifiers: baseIngredients.map((ingredient) => ({
              ...ingredient,
              baseQuantity: ingredient.quantity,
              isExtra: false,
            })),
          },
        ],
      };
    });
  },
  // Half-and-half pizzas are always a distinct line (never merged), so they are
  // added through their own action instead of addItem + updateNotes.
  addHalfAndHalfItem: ({ baseProduct, secondHalfProduct, unitPrice } = {}) => {
    const baseProductId = baseProduct?._id ?? baseProduct?.id;
    const secondHalfProductId = secondHalfProduct?._id ?? secondHalfProduct?.id;
    if (!baseProductId || !secondHalfProductId) {
      return;
    }

    const baseIngredients = normalizeIngredients(baseProduct?.ingredients ?? []);
    set((state) => ({
      items: [
        ...state.items,
        {
          id: `half-${baseProductId}-${secondHalfProductId}-${Date.now()}`,
          productId: String(baseProductId),
          name: baseProduct?.name ?? "Producto",
          price: normalizePrice(unitPrice),
          basePrice: normalizePrice(baseProduct?.price),
          notes: [],
          modifierNotes: [],
          note: "",
          quantity: 1,
          allowsHalf: true,
          sizeId: baseProduct?.sizeId ?? null,
          categoryId: baseProduct?.categoryId ?? null,
          isHalfAndHalf: true,
          halves: [{ productId: secondHalfProductId, name: secondHalfProduct?.name ?? "Product" }],
          baseIngredients,
          modifiers: baseIngredients.map((ingredient) => ({
            ...ingredient,
            baseQuantity: ingredient.quantity,
            isExtra: false,
          })),
        },
      ],
    }));
  },
  removeItem: (productId) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== productId),
    }));
  },
  increaseQty: (productId) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ),
    }));
  },
  decreaseQty: (productId) => {
    set((state) => ({
      items: state.items.map((item) => {
        if (item.id !== productId) {
          return item;
        }
        const nextQty = Math.max(1, item.quantity - 1);
        return { ...item, quantity: nextQty };
      }),
    }));
  },
  updateNotes: (
    productId,
    { notes, note, modifierNotes, modifiers, isHalfAndHalf, halves, price }
  ) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId
          ? {
              ...item,
              notes: normalizeNotes(notes),
              modifierNotes: normalizeNotes(modifierNotes),
              note: typeof note === "string" ? note : item.note ?? "",
              modifiers: Array.isArray(modifiers) ? modifiers : item.modifiers,
              isHalfAndHalf:
                typeof isHalfAndHalf === "boolean"
                  ? isHalfAndHalf
                  : item.isHalfAndHalf,
              halves: Array.isArray(halves) ? halves : item.halves ?? [],
              price: Number.isFinite(Number(price)) ? Number(price) : item.price,
            }
          : item
      ),
    }));
  },
  clearOrder: () => set({ items: [], customerName: "", editingOrder: null }),
  getSubtotal: () => {
    const { items } = get();
    return items.reduce(
      (total, item) => total + normalizePrice(item.price) * item.quantity,
      0
    );
  },
}));

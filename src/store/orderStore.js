import { create } from "./zustand";

const SHARED_ACCOUNT = "shared";

const genLineId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `line-${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;

// Sub-cuenta activa -> accountId real que se guarda en la linea (Compartido = null).
const resolveTargetAccount = (splitEnabled, activeAccountId) =>
  splitEnabled && activeAccountId && activeAccountId !== SHARED_ACCOUNT
    ? activeAccountId
    : null;

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
  const lineId = item?.lineId ?? item?._id ?? item?.id ?? `${productId}-${index}`;

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
    lineId: String(lineId),
    accountId: item?.accountId ?? null,
    paidQuantity: Number(item?.paidQuantity ?? 0),
    settled: Boolean(item?.settled),
    requiresKitchen: item?.requiresKitchen !== false,
    productId: String(productId),
    name: item?.productName ?? item?.name ?? "Producto",
    price: normalizedPrice,
    basePrice: normalizedPrice,
    notes: normalizeNotes(item?.notes),
    modifierNotes: normalizeNotes(item?.modifierNotes),
    note: typeof item?.note === "string" ? item.note : "",
    quantity: normalizedQuantity,
    allowsHalf: Boolean(item?.isHalfAndHalf),
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
      String(item?.accountId ?? ""),
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
  // Split bill (cuentas por persona)
  splitEnabled: false,
  subAccounts: [],
  activeAccountId: SHARED_ACCOUNT,
  setCustomerName: (customerName) =>
    set({ customerName: typeof customerName === "string" ? customerName : "" }),
  hydrateOrder: (order) => {
    if (!order) {
      return;
    }

    const orderId = order?._id ?? order?.id;
    const items = Array.isArray(order?.items) ? order.items : [];
    const normalizedItems = items.map((item, index) => normalizeOrderItem(item, index));
    const subAccounts = Array.isArray(order?.subAccounts)
      ? order.subAccounts.map((a) => ({
          id: String(a.id),
          name: a.name ?? "",
          isPaid: Boolean(a.isPaid),
        }))
      : [];

    set({
      items: normalizedItems,
      customerName: typeof order?.customerName === "string" ? order.customerName : "",
      splitEnabled: Boolean(order?.splitEnabled),
      subAccounts,
      activeAccountId: SHARED_ACCOUNT,
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
  // ----- Split bill actions -----
  setSplitEnabled: (value) =>
    set((state) => ({
      splitEnabled: Boolean(value),
      activeAccountId: value ? state.activeAccountId : SHARED_ACCOUNT,
    })),
  addSubAccount: (name) => {
    const id = genLineId();
    set((state) => ({
      splitEnabled: true,
      subAccounts: [
        ...state.subAccounts,
        { id, name: String(name || "").trim() || `Persona ${state.subAccounts.length + 1}` },
      ],
      activeAccountId: id,
    }));
    return id;
  },
  renameSubAccount: (id, name) =>
    set((state) => ({
      subAccounts: state.subAccounts.map((a) =>
        a.id === id ? { ...a, name: String(name || "").trim() } : a
      ),
    })),
  removeSubAccount: (id) =>
    set((state) => ({
      subAccounts: state.subAccounts.filter((a) => a.id !== id),
      // sus lineas vuelven a Compartido
      items: state.items.map((it) =>
        String(it.accountId || "") === String(id) ? { ...it, accountId: null } : it
      ),
      activeAccountId:
        state.activeAccountId === id ? SHARED_ACCOUNT : state.activeAccountId,
    })),
  setActiveAccount: (id) => set({ activeAccountId: id || SHARED_ACCOUNT }),
  assignItemToAccount: (lineId, accountId) =>
    set((state) => ({
      items: state.items.map((it) =>
        it.id === lineId
          ? { ...it, accountId: accountId && accountId !== SHARED_ACCOUNT ? accountId : null }
          : it
      ),
    })),
  addItem: (product) => {
    const productId = resolveProductId(product);
    if (!product || !productId) {
      return;
    }

    set((state) => {
      const targetAccount = resolveTargetAccount(state.splitEnabled, state.activeAccountId);
      // Merge into an existing plain line for the same product AND sub-cuenta.
      // Asi, el mismo producto para Juan y para Ana son lineas distintas, pero
      // agregar de nuevo a la cuenta activa incrementa esa linea.
      const existing = state.items.find(
        (item) =>
          String(item.productId) === String(productId) &&
          !item.isHalfAndHalf &&
          !item.settled &&
          String(item.accountId || "") === String(targetAccount || "")
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
      const lineId = genLineId();
      return {
        items: [
          ...state.items,
          {
            id: lineId,
            lineId,
            accountId: targetAccount,
            paidQuantity: 0,
            settled: false,
            productId,
            name: product.name ?? "Producto",
            price: normalizePrice(product.price),
            basePrice: normalizePrice(product.price),
            notes: normalizeNotes(product.notes),
            modifierNotes: [],
            note: "",
            quantity: 1,
            allowsHalf: Boolean(product?.allowsHalf),
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
    set((state) => {
      const lineId = genLineId();
      const targetAccount = resolveTargetAccount(state.splitEnabled, state.activeAccountId);
      return {
      items: [
        ...state.items,
        {
          id: lineId,
          lineId,
          accountId: targetAccount,
          paidQuantity: 0,
          settled: false,
          productId: String(baseProductId),
          name: baseProduct?.name ?? "Producto",
          price: normalizePrice(unitPrice),
          basePrice: normalizePrice(baseProduct?.price),
          notes: [],
          modifierNotes: [],
          note: "",
          quantity: 1,
          allowsHalf: true,
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
      };
    });
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
  clearOrder: () =>
    set({
      items: [],
      customerName: "",
      editingOrder: null,
      splitEnabled: false,
      subAccounts: [],
      activeAccountId: SHARED_ACCOUNT,
    }),
  getSubtotal: () => {
    const { items } = get();
    return items.reduce(
      (total, item) => total + normalizePrice(item.price) * item.quantity,
      0
    );
  },
  // Subtotal de una sub-cuenta (Compartido = accountId null).
  getSubtotalByAccount: (accountId) => {
    const { items } = get();
    const target = accountId && accountId !== SHARED_ACCOUNT ? accountId : null;
    return items
      .filter((item) => String(item.accountId || "") === String(target || ""))
      .reduce((total, item) => total + normalizePrice(item.price) * item.quantity, 0);
  },
  getSharedSubtotal: () => {
    const { items } = get();
    return items
      .filter((item) => !item.accountId)
      .reduce((total, item) => total + normalizePrice(item.price) * item.quantity, 0);
  },
}));

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

export const useOrderStore = create((set, get) => ({
  items: [],
  addItem: (product) => {
    const productId = resolveProductId(product);
    if (!product || !productId) {
      return;
    }

    set((state) => {
      const existing = state.items.find((item) => item.id === productId);
      if (existing) {
        return {
          items: state.items.map((item) =>
            item.id === productId
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
            name: product.name ?? "Producto",
            price: normalizePrice(product.price),
            notes: normalizeNotes(product.notes),
            quantity: 1,
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
  updateNotes: (productId, { notes, modifiers }) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId
          ? {
              ...item,
              notes: normalizeNotes(notes),
              modifiers: Array.isArray(modifiers) ? modifiers : item.modifiers,
            }
          : item
      ),
    }));
  },
  clearOrder: () => set({ items: [] }),
  getSubtotal: () => {
    const { items } = get();
    return items.reduce(
      (total, item) => total + normalizePrice(item.price) * item.quantity,
      0
    );
  },
}));

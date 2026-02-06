import { create } from "./zustand";

const resolveProductId = (product) =>
  product?._id ?? product?.id ?? product?.sku ?? product?.name;

const normalizePrice = (price) => Number(price ?? 0);

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
      return {
        items: [
          ...state.items,
          {
            id: productId,
            name: product.name ?? "Producto",
            price: normalizePrice(product.price),
            notes: product.notes ?? "Sin observaciones",
            quantity: 1,
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
  updateNotes: (productId, notes) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === productId ? { ...item, notes } : item
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

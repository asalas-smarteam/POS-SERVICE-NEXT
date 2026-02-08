"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CategoryTabs } from "@/components/sales/category-tabs";
import { OrderSidebar } from "@/components/sales/order-sidebar";
import { ProductGrid } from "@/components/sales/product-grid";
import { SalesHeader } from "@/components/sales/sales-header";
import { TicketPreviewDialog } from "@/components/sales/ticket-preview-dialog";
import { generateKitchenTicketPdf } from "@/lib/pdf/ticketJsPdf";
import { useAuthStore } from "../../../store/authStore";
import { useOrderStore } from "../../../store/orderStore";
import { useProductsStore } from "../../../store/productsStore";
import { useSettingsStore } from "../../../store/settingsStore";

const getTenantHeader = () => {
  const tenant = useAuthStore.getState().tenant;
  const tenantSlug = tenant?.slug ?? tenant ?? null;
  return tenantSlug ? { "x-tenant": tenantSlug } : {};
};

const normalizeOrderNumber = (orderId) => {
  if (!orderId) {
    return "000";
  }
  const trimmed = String(orderId).slice(-5);
  return trimmed.padStart(3, "0");
};

const buildInventoryPayload = (item) => {
  const modifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];
  const baseIngredients = Array.isArray(item?.baseIngredients)
    ? item.baseIngredients
    : [];

  const ingredientMap = new Map();
  const applyQuantity = (ingredientId, quantity) => {
    if (!ingredientId) {
      return;
    }
    const current = ingredientMap.get(String(ingredientId)) || 0;
    ingredientMap.set(String(ingredientId), current + quantity);
  };

  if (modifiers.length) {
    modifiers.forEach((modifier) => {
      const ingredientId = modifier.ingredientId;
      const qty = Number(modifier.quantity ?? 0) * item.quantity;
      if (qty > 0) {
        applyQuantity(ingredientId, qty);
      }
    });
  } else {
    baseIngredients.forEach((ingredient) => {
      const qty = Number(ingredient.quantity ?? 0) * item.quantity;
      if (qty > 0) {
        applyQuantity(ingredient.ingredientId, qty);
      }
    });
  }

  return Array.from(ingredientMap.entries()).map(([ingredientId, quantity]) => ({
    ingredientId,
    quantity,
  }));
};

export default function SalesPage() {
  const { products, loading, error, fetchProducts } = useProductsStore(
    (state) => ({
      products: state.products,
      loading: state.loading,
      error: state.error,
      fetchProducts: state.fetchProducts,
    })
  );

  const { categories, fetchSettings } = useSettingsStore((state) => ({
    categories: state.categories,
    fetchSettings: state.fetchSettings,
  }));

  const {
    items,
    addItem,
    increaseQty,
    decreaseQty,
    removeItem,
    updateNotes,
    clearOrder,
  } = useOrderStore((state) => ({
    items: state.items,
    addItem: state.addItem,
    increaseQty: state.increaseQty,
    decreaseQty: state.decreaseQty,
    removeItem: state.removeItem,
    updateNotes: state.updateNotes,
    clearOrder: state.clearOrder,
  }));

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketPreview, setTicketPreview] = useState(null);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    setIsFiltering(true);
    const timeout = setTimeout(() => setIsFiltering(false), 300);
    return () => clearTimeout(timeout);
  }, [searchTerm, activeCategory]);

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const term = searchTerm.trim().toLowerCase();
    return list.filter((product) => {
      const matchesSearch = term
        ? product?.name?.toLowerCase().includes(term)
        : true;
      if (!matchesSearch) {
        return false;
      }
      if (activeCategory === "all") {
        return true;
      }
      return product?.categoryId === activeCategory;
    });
  }, [products, searchTerm, activeCategory]);

  const subtotal = useMemo(
    () =>
      items.reduce(
        (total, item) => total + Number(item.price ?? 0) * item.quantity,
        0
      ),
    [items]
  );

  const buildItemPayload = useCallback((item) => {
    const notes = Array.isArray(item?.notes)
      ? item.notes.filter(Boolean)
      : item?.notes
        ? [item.notes]
        : [];
    const modifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];
    const removedIngredients = modifiers
      .filter(
        (modifier) =>
          Number(modifier.baseQuantity ?? 0) > 0 &&
          Number(modifier.quantity ?? 0) === 0
      )
      .map((modifier) => modifier.ingredientId);
    const extraIngredients = modifiers
      .filter(
        (modifier) =>
          Number(modifier.quantity ?? 0) > Number(modifier.baseQuantity ?? 0)
      )
      .map((modifier) => ({
        ingredientId: modifier.ingredientId,
        quantity:
          Number(modifier.quantity ?? 0) - Number(modifier.baseQuantity ?? 0),
      }));

    return {
      productId: item.id,
      productName: item.name,
      quantity: item.quantity,
      notes,
      note: notes.join(", "),
      modifiers: modifiers.length ? modifiers : undefined,
      removedIngredients,
      extraIngredients,
    };
  }, []);

  const handleCheckout = useCallback(async () => {
    if (!items.length || isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setCheckoutError("");

    try {
      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeader(),
        },
      });
      if (!orderResponse.ok) {
        throw new Error("No se pudo crear la orden.");
      }
      const order = await orderResponse.json();
      const orderId = order?._id ?? order?.id;

      for (const item of items) {
        const itemPayload = buildItemPayload(item);
        const itemResponse = await fetch(`/api/orders/${orderId}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getTenantHeader(),
          },
          body: JSON.stringify(itemPayload),
        });
        if (!itemResponse.ok) {
          throw new Error("No se pudieron agregar items a la orden.");
        }
      }

      const inventoryRequests = items.flatMap((item) =>
        buildInventoryPayload(item)
      );
      for (const ingredient of inventoryRequests) {
        const consumeResponse = await fetch("/api/inventory/consume", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getTenantHeader(),
          },
          body: JSON.stringify({
            ...ingredient,
            orderId,
          }),
        });
        if (!consumeResponse.ok) {
          throw new Error("No se pudo descontar inventario.");
        }
      }

      const sendResponse = await fetch(`/api/orders/${orderId}/send-to-kitchen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeader(),
        },
      });
      if (!sendResponse.ok) {
        throw new Error("No se pudo enviar la orden a cocina.");
      }

      const ticketData = {
        orderNumber: normalizeOrderNumber(orderId),
        tableLabel: "Mesa / Cliente",
        tableValue: "Walk-in Customer",
        datetimeLabel: "Fecha y hora",
        datetimeValue: new Date(order?.createdAt ?? Date.now()).toLocaleString(),
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          notes: Array.isArray(item.notes) ? item.notes : [],
        })),
        orderNotes: [],
        terminalLabel: "Terminal",
        terminalValue: "Caja 1",
      };

      try {
        const doc = await generateKitchenTicketPdf(ticketData);
        doc.output("datauristring");
      } catch (pdfError) {
        console.warn("No se pudo generar el ticket PDF.", pdfError);
      }

      setTicketPreview(ticketData);
      setTicketDialogOpen(true);
      clearOrder();
    } catch (error) {
      setCheckoutError(error?.message || "Error al confirmar la compra.");
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [items, buildItemPayload, clearOrder]);

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        handleCheckout();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCheckout]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
        <SalesHeader
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
        />

        <div className="flex flex-1 flex-col gap-6 lg:flex-row">
          <section className="flex-1">
            <CategoryTabs
              categories={categories}
              activeCategory={activeCategory}
              onSelect={setActiveCategory}
            />
            <ProductGrid
              products={filteredProducts}
              loading={loading}
              error={error}
              isFiltering={isFiltering}
              onSelect={addItem}
            />
          </section>

          <OrderSidebar
            className="lg:sticky lg:top-6 lg:self-start"
            items={items}
            subtotal={subtotal}
            onIncrease={increaseQty}
            onDecrease={decreaseQty}
            onRemove={removeItem}
            onUpdateNotes={updateNotes}
            onClear={clearOrder}
            onCheckout={handleCheckout}
            isSubmitting={isSubmitting}
            checkoutError={checkoutError}
          />
        </div>
      </div>

      <TicketPreviewDialog
        open={ticketDialogOpen}
        onOpenChange={setTicketDialogOpen}
        ticket={ticketPreview}
        onPrint={() => window.print()}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CategoryTabs } from "@/components/sales/category-tabs";
import { HalfAndHalfQuickSelectorDialog } from "@/components/sales/half-and-half-quick-selector-dialog";
import { OrderCheckoutDialog } from "@/components/sales/order-checkout-dialog";
import { OrderSidebar } from "@/components/sales/order-sidebar";
import { ProductGrid } from "@/components/sales/product-grid";
import { SalesHeader } from "@/components/sales/sales-header";
import { TicketPreviewDialog } from "@/components/sales/ticket-preview-dialog";
import { generateKitchenTicketPdf } from "@/lib/pdf/ticketJsPdf";
import { filterCompatibleHalfProducts } from "@/lib/halfAndHalf";
import { calculateOrderItemUnitPrice } from "@/lib/pricing/halfAndHalfPricing";
import { resolvePaymentModeFromStrategy } from "@/lib/tenant/paymentStrategySettings";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { getTenantHeaders } from "../../../../../store/tenantHeaders";
import { useOrderStore, buildOrderItemsSignature } from "../../../../../store/orderStore";
import { useProductsStore } from "../../../../../store/productsStore";
import { useSettingsStore } from "../../../../../store/settingsStore";

const normalizeOrderNumber = (orderId) => {
  if (!orderId) {
    return "000";
  }
  const trimmed = String(orderId).slice(-5);
  return trimmed.padStart(3, "0");
};

export default function OrdersPage() {
  const t = useTranslations("Orders");
  const tk = useTranslations("Kitchen");
  const searchParams = useSearchParams();
  const { products, loading, error, fetchProducts } = useProductsStore(
    (state) => ({
      products: state.products,
      loading: state.loading,
      error: state.error,
      fetchProducts: state.fetchProducts,
    })
  );

  const {
    categories,
    halfAndHalfPricing,
    paymentStrategy,
    paymentStrategyOptions,
    orderTypes,
    fetchSettings,
  } = useSettingsStore((state) => ({
    categories: state.categories,
    halfAndHalfPricing: state.halfAndHalfPricing,
    paymentStrategy: state.paymentStrategy,
    paymentStrategyOptions: state.paymentStrategyOptions,
    orderTypes: state.orderTypes,
    fetchSettings: state.fetchSettings,
  }));

  const {
    items,
    addItem,
    addHalfAndHalfItem,
    increaseQty,
    decreaseQty,
    removeItem,
    updateNotes,
    clearOrder,
    customerName,
    setCustomerName,
    editingOrder,
    hydrateOrder,
  } = useOrderStore((state) => ({
    items: state.items,
    addItem: state.addItem,
    addHalfAndHalfItem: state.addHalfAndHalfItem,
    increaseQty: state.increaseQty,
    decreaseQty: state.decreaseQty,
    removeItem: state.removeItem,
    updateNotes: state.updateNotes,
    clearOrder: state.clearOrder,
    customerName: state.customerName,
    setCustomerName: state.setCustomerName,
    editingOrder: state.editingOrder,
    hydrateOrder: state.hydrateOrder,
  }));

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketPreview, setTicketPreview] = useState(null);
  const [checkoutDialogOpen, setCheckoutDialogOpen] = useState(false);
  const [tables, setTables] = useState([]);
  const [halfSelectorOpen, setHalfSelectorOpen] = useState(false);
  const [selectedHalfBaseProduct, setSelectedHalfBaseProduct] = useState(null);
  const [selectedOrderType, setSelectedOrderType] = useState("takeaway");
  const [selectedTableId, setSelectedTableId] = useState("");
  const [hydratingOrder, setHydratingOrder] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const isSubmittingRef = useRef(false);
  const editingOrderId = editingOrder?.orderId ? String(editingOrder.orderId) : "";
  const isEditingExistingOrder = Boolean(editingOrderId);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    const fetchTables = async () => {
      try {
        const response = await fetch("/api/tables", {
          headers: {
            ...getTenantHeaders(),
          },
        });
        if (!response.ok) {
          setTables([]);
          return;
        }
        const body = await response.json();
        setTables(Array.isArray(body) ? body : []);
      } catch {
        setTables([]);
      }
    };

    fetchTables();
  }, []);

  useEffect(() => {
    const queryTableId = searchParams.get("tableId");
    const queryOrderType = searchParams.get("orderType");

    if (queryTableId) {
      setSelectedTableId(queryTableId);
    }

    if (queryOrderType) {
      setSelectedOrderType(queryOrderType);
    }
  }, [searchParams]);

  useEffect(() => {
    const queryOrderId = searchParams.get("orderId");
    if (!queryOrderId) {
      return;
    }

    if (editingOrder?.orderId && String(editingOrder.orderId) === String(queryOrderId)) {
      setSelectedOrderType(editingOrder?.orderType || "takeaway");
      setSelectedTableId(editingOrder?.tableId || "");
      return;
    }

    let ignore = false;

    const hydrateFromApi = async () => {
      setHydratingOrder(true);
      try {
        const response = await fetch("/api/orders?active=true", {
          headers: {
            ...getTenantHeaders(),
          },
        });
        const body = await response.json().catch(() => []);
        if (!response.ok || !Array.isArray(body)) {
          return;
        }
        const matchedOrder = body.find(
          (order) => String(order?._id ?? order?.id) === String(queryOrderId)
        );
        if (!matchedOrder || ignore) {
          return;
        }

        hydrateOrder(matchedOrder);
        setSelectedOrderType(matchedOrder?.orderType || "takeaway");
        setSelectedTableId(matchedOrder?.tableId || "");
      } finally {
        if (!ignore) {
          setHydratingOrder(false);
        }
      }
    };

    hydrateFromApi();

    return () => {
      ignore = true;
    };
  }, [editingOrder?.orderId, editingOrder?.orderType, editingOrder?.tableId, hydrateOrder, searchParams]);

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

  const resolveItemUnitPrice = useCallback((item) => {
    const basePrice = Number(item?.basePrice ?? item?.price ?? 0);
    if (!item?.isHalfAndHalf) {
      return basePrice;
    }

    const halfProductId = item?.halves?.[0]?.productId;
    const halfProduct = (products || []).find((product) => product?._id === halfProductId);

    return calculateOrderItemUnitPrice({
      isHalfAndHalf: true,
      priceA: Number(basePrice),
      priceB: Number(halfProduct?.price ?? 0),
      regularPrice: Number(basePrice),
      pricingSettings: halfAndHalfPricing,
    });
  }, [products, halfAndHalfPricing]);

  const subtotal = useMemo(
    () =>
      items.reduce((total, item) => total + resolveItemUnitPrice(item) * item.quantity, 0),
    [items, resolveItemUnitPrice]
  );

  const buildItemPayload = useCallback((item) => {
    const modifierNotes = Array.isArray(item?.modifierNotes)
      ? item.modifierNotes.filter(Boolean)
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
      productId: item.productId ?? item.id,
      productName: item.name,
      quantity: item.quantity,
      modifierNotes,
      note: typeof item?.note === "string" ? item.note : "",
      modifiers: modifiers.length ? modifiers : undefined,
      removedIngredients,
      extraIngredients,
      isHalfAndHalf: Boolean(item?.isHalfAndHalf),
      halves: Array.isArray(item?.halves) ? item.halves : [],
    };
  }, []);

  // Unsaved changes = the current cart differs from the persisted order
  // snapshot captured at hydration (covers adds, removals, quantity and notes).
  const currentItemsSignature = useMemo(() => buildOrderItemsSignature(items), [items]);
  const hasUnsavedChanges =
    isEditingExistingOrder && currentItemsSignature !== (editingOrder?.itemsSignature ?? "");
  const hasUnsavedChangesRef = useRef(false);
  useEffect(() => {
    hasUnsavedChangesRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  // Reset the cart whenever /orders is opened without a specific order, so a
  // previously edited/created order never lingers in the view.
  const queryOrderId = searchParams.get("orderId");
  useEffect(() => {
    if (!queryOrderId) {
      clearOrder();
    }
  }, [queryOrderId, clearOrder]);

  // Warn before leaving (refresh / close tab / external links) with unsaved edits.
  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!hasUnsavedChangesRef.current) {
        return;
      }
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []);

  // Guard in-app navigation (sidebar links, etc.) while there are unsaved edits.
  useEffect(() => {
    const handleDocumentClick = (event) => {
      if (!hasUnsavedChangesRef.current || event.defaultPrevented) {
        return;
      }
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = event.target?.closest?.("a[href]");
      if (!anchor) {
        return;
      }
      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.origin !== window.location.origin || targetUrl.pathname === window.location.pathname) {
        return;
      }
      if (window.confirm(t("unsavedChangesPrompt"))) {
        clearOrder();
      } else {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    document.addEventListener("click", handleDocumentClick, true);
    return () => document.removeEventListener("click", handleDocumentClick, true);
  }, [clearOrder, t]);

  const handleCheckout = useCallback(async (checkoutValues) => {
    if (!items.length || isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSubmitting(true);
    setCheckoutError("");

    try {
      const customerNameValue = checkoutValues?.customerName ?? customerName;
      const orderTypeValue = checkoutValues?.orderType ?? selectedOrderType;
      const tableIdValue = checkoutValues?.tableId ?? null;
      const tableLabelValue = checkoutValues?.tableLabel ?? null;
      const paymentMode = resolvePaymentModeFromStrategy(paymentStrategy, paymentStrategyOptions);

      const ticketLabels = {
        half: tk("half"),
        ingredients: tk("ingredients"),
        extras: tk("extras"),
        removed: tk("removed"),
        cashierNote: tk("cashierNote"),
        kitchenOrder: tk("kitchenOrder"),
        customer: tk("customer"),
        notes: tk("notes"),
        endOfTicket: tk("endOfTicket"),
      };

      const buildTicketNotes = () =>
        items
          .filter((item) => typeof item.note === "string" && item.note.trim())
          .map((item) => item.note.trim());

      if (isEditingExistingOrder) {
        const orderId = editingOrderId;

        // Persist the exact current cart (adds, removals, quantity changes)
        // before closing the order.
        const itemsResponse = await fetch(`/api/orders/${orderId}/items`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...getTenantHeaders(),
          },
          body: JSON.stringify({ items: items.map((item) => buildItemPayload(item)) }),
        });
        if (!itemsResponse.ok) {
          const itemsBody = await itemsResponse.json().catch(() => ({}));
          throw new Error(itemsBody?.error || t("orderItemsError"));
        }

        // Finalizing an existing order means the customer paid: close it so it
        // leaves the active orders list and moves to a completed state.
        const checkoutResponse = await fetch(`/api/orders/${orderId}/checkout`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getTenantHeaders(),
          },
        });
        if (!checkoutResponse.ok) {
          const checkoutBody = await checkoutResponse.json().catch(() => ({}));
          throw new Error(checkoutBody?.error || t("checkoutError"));
        }

        const orderTypeLabel =
          orderTypes.find((type) => type.id === (editingOrder?.orderType || orderTypeValue))?.label || t("orderType");
        const tableValue = (editingOrder?.orderType || orderTypeValue) === "onTable"
          ? editingOrder?.tableLabel || tableLabelValue || t("notAssigned")
          : customerNameValue || t("walkInCustomer");

        const ticketData = {
          orderNumber: normalizeOrderNumber(orderId),
          tableLabel: orderTypeLabel,
          tableValue,
          datetimeLabel: t("dateAndTime"),
          datetimeValue: new Date().toLocaleString(),
          items: items.map((item) => ({
            productName: item.name,
            quantity: item.quantity,
            modifierNotes: Array.isArray(item.modifierNotes) ? item.modifierNotes : [],
            note: typeof item.note === "string" ? item.note : "",
            type: item.type,
            modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
            isHalfAndHalf: Boolean(item.isHalfAndHalf),
            halves: Array.isArray(item.halves) ? item.halves : [],
          })),
          customerName: customerNameValue,
          orderNotes: buildTicketNotes(),
          labels: ticketLabels,
          terminalLabel: t("terminal"),
          terminalValue: t("register"),
        };

        setTicketPreview(ticketData);
        setTicketDialogOpen(true);
        setCheckoutDialogOpen(false);
        clearOrder();
        setSelectedOrderType("takeaway");
        setSelectedTableId("");
        return;
      }

      const orderResponse = await fetch("/api/orders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeaders(),
        },
        body: JSON.stringify({
          customerName: customerNameValue,
          orderType: orderTypeValue,
          tableId: tableIdValue,
          tableLabel: tableLabelValue,
          paymentMode,
        }),
      });
      if (!orderResponse.ok) {
        throw new Error(t("orderCreateError"));
      }
      const order = await orderResponse.json();
      const orderId = order?._id ?? order?.id;

      for (const item of items) {
        const itemPayload = buildItemPayload(item);
        const itemResponse = await fetch(`/api/orders/${orderId}/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...getTenantHeaders(),
          },
          body: JSON.stringify(itemPayload),
        });
        if (!itemResponse.ok) {
          throw new Error(t("orderItemsError"));
        }
      }

      const sendResponse = await fetch(`/api/orders/${orderId}/send-to-kitchen`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeaders(),
        },
        body: JSON.stringify({
          customerName: customerNameValue,
          orderType: orderTypeValue,
          tableId: tableIdValue,
          tableLabel: tableLabelValue,
          paymentMode,
        }),
      });
      if (!sendResponse.ok) {
        throw new Error(t("sendKitchenError"));
      }

      const orderTypeLabel =
        orderTypes.find((type) => type.id === orderTypeValue)?.label || t("orderType");
      const tableValue = orderTypeValue === "onTable"
        ? tableLabelValue || t("notAssigned")
        : customerNameValue || t("walkInCustomer");

      const ticketData = {
        orderNumber: normalizeOrderNumber(orderId),
        tableLabel: orderTypeLabel,
        tableValue,
        datetimeLabel: t("dateAndTime"),
        datetimeValue: new Date(order?.createdAt ?? Date.now()).toLocaleString(),
        items: items.map((item) => ({
          productName: item.name,
          quantity: item.quantity,
          modifierNotes: Array.isArray(item.modifierNotes) ? item.modifierNotes : [],
          note: typeof item.note === "string" ? item.note : "",
          type: item.type,
          modifiers: Array.isArray(item.modifiers) ? item.modifiers : [],
          isHalfAndHalf: Boolean(item.isHalfAndHalf),
          halves: Array.isArray(item.halves) ? item.halves : [],
        })),
        customerName: customerNameValue,
        orderNotes: buildTicketNotes(),
        labels: ticketLabels,
        terminalLabel: t("terminal"),
        terminalValue: t("register"),
      };

      try {
        const doc = await generateKitchenTicketPdf(ticketData);
        doc.output("datauristring");
      } catch (pdfError) {
        console.warn(t("pdfError"), pdfError);
      }

      setTicketPreview(ticketData);
      setTicketDialogOpen(true);
      setCheckoutDialogOpen(false);
      clearOrder();
      setSelectedOrderType("takeaway");
      setSelectedTableId("");
    } catch (error) {
      setCheckoutError(error?.message || t("checkoutError"));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [
    items,
    buildItemPayload,
    clearOrder,
    customerName,
    selectedOrderType,
    paymentStrategy,
    paymentStrategyOptions,
    orderTypes,
    editingOrder?.orderType,
    editingOrder?.tableLabel,
    editingOrderId,
    isEditingExistingOrder,
    t,
  ]);

  // Persist edits to an existing order without closing it (the order stays
  // active). Re-hydrates from the saved order so deltas reset to zero.
  const handleSaveOrder = useCallback(async () => {
    if (!isEditingExistingOrder || !hasUnsavedChanges || isSubmittingRef.current) {
      return;
    }
    isSubmittingRef.current = true;
    setIsSaving(true);
    setCheckoutError("");

    try {
      const orderId = editingOrderId;
      const response = await fetch(`/api/orders/${orderId}/items`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeaders(),
        },
        body: JSON.stringify({ items: items.map((item) => buildItemPayload(item)) }),
      });
      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody?.error || t("orderItemsError"));
      }

      const latestOrder = await response.json().catch(() => null);
      if (latestOrder) {
        hydrateOrder(latestOrder);
        setSelectedOrderType(latestOrder?.orderType || "takeaway");
        setSelectedTableId(latestOrder?.tableId || "");
      }

      toast.success(t("orderSaved"));
    } catch (error) {
      setCheckoutError(error?.message || t("checkoutError"));
    } finally {
      isSubmittingRef.current = false;
      setIsSaving(false);
    }
  }, [
    isEditingExistingOrder,
    hasUnsavedChanges,
    items,
    buildItemPayload,
    editingOrderId,
    hydrateOrder,
    t,
  ]);

  const handleCheckoutRequest = useCallback(() => {
    if (!items.length || isSubmittingRef.current) {
      return;
    }
    setCheckoutError("");
    setCheckoutDialogOpen(true);
  }, [items]);

  const handleCheckoutConfirm = useCallback((checkoutValues) => {
    setCustomerName(checkoutValues?.customerName || "");
    setSelectedOrderType(checkoutValues?.orderType || "takeaway");
    setSelectedTableId(checkoutValues?.tableId || "");
    handleCheckout(checkoutValues);
  }, [handleCheckout, setCustomerName]);

  const compatibleHalfProducts = useMemo(
    () =>
      filterCompatibleHalfProducts({
        products,
        currentProduct: selectedHalfBaseProduct,
      }),
    [products, selectedHalfBaseProduct]
  );

  const selectedTable = useMemo(
    () => tables.find((table) => table.id === selectedTableId) || null,
    [tables, selectedTableId]
  );

  const handleProductLongPress = useCallback(
    (product) => {
      if (!product?.allowsHalf) {
        addItem(product);
        return;
      }

      const compatibleProducts = filterCompatibleHalfProducts({
        products,
        currentProduct: product,
      });

      if (!compatibleProducts.length) {
        toast.error(t("noCompatibleHalfProducts"));
        return;
      }

      setSelectedHalfBaseProduct(product);
      setHalfSelectorOpen(true);
    },
    [addItem, products, t]
  );

  const handleHalfAndHalfConfirm = useCallback(
    (secondHalfProduct) => {
      const baseProduct = selectedHalfBaseProduct;
      if (!baseProduct || !secondHalfProduct) {
        return;
      }

      const halfUnitPrice = calculateOrderItemUnitPrice({
        isHalfAndHalf: true,
        priceA: Number(baseProduct?.price ?? 0),
        priceB: Number(secondHalfProduct?.price ?? 0),
        regularPrice: Number(baseProduct?.price ?? 0),
        pricingSettings: halfAndHalfPricing,
      });

      addHalfAndHalfItem({
        baseProduct,
        secondHalfProduct,
        unitPrice: halfUnitPrice,
      });

      setHalfSelectorOpen(false);
      setSelectedHalfBaseProduct(null);
    },
    [addHalfAndHalfItem, selectedHalfBaseProduct, halfAndHalfPricing]
  );

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "F2") {
        event.preventDefault();
        handleCheckoutRequest();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCheckoutRequest]);

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
              onLongSelect={handleProductLongPress}
            />
          </section>

          <OrderSidebar
            className="lg:sticky lg:top-6 lg:self-start"
            items={items}
            orderNumber={isEditingExistingOrder ? normalizeOrderNumber(editingOrderId) : ""}
            orderContextLabel={
              selectedOrderType === "onTable"
                ? selectedTable?.name || selectedTableId || t("notAssigned")
                : customerName || t("walkInCustomer")
            }
            subtotal={subtotal}
            onIncrease={increaseQty}
            onDecrease={decreaseQty}
            onRemove={removeItem}
            onUpdateNotes={updateNotes}
            onClear={clearOrder}
            onCheckout={handleCheckoutRequest}
            onSave={handleSaveOrder}
            isEditing={isEditingExistingOrder}
            canSave={hasUnsavedChanges}
            isSaving={isSaving}
            isSubmitting={isSubmitting || hydratingOrder}
            isLoading={hydratingOrder}
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

      <OrderCheckoutDialog
        open={checkoutDialogOpen}
        onOpenChange={setCheckoutDialogOpen}
        orderTypes={orderTypes}
        tables={tables}
        isSubmitting={isSubmitting}
        defaultCustomerName={customerName}
        defaultOrderType={selectedOrderType || orderTypes[0]?.id || "takeaway"}
        defaultTableId={selectedTableId}
        lockOrderTypeAndTable={isEditingExistingOrder}
        onConfirm={handleCheckoutConfirm}
      />

      <HalfAndHalfQuickSelectorDialog
        open={halfSelectorOpen}
        onOpenChange={(open) => {
          setHalfSelectorOpen(open);
          if (!open) {
            setSelectedHalfBaseProduct(null);
          }
        }}
        baseProduct={selectedHalfBaseProduct}
        compatibleProducts={compatibleHalfProducts}
        onConfirm={handleHalfAndHalfConfirm}
      />
    </div>
  );
}

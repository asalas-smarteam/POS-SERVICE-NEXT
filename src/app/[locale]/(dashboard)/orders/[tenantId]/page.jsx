"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CategoryTabs } from "@/components/sales/category-tabs";
import { HalfAndHalfQuickSelectorDialog } from "@/components/sales/half-and-half-quick-selector-dialog";
import { OrderSidebar } from "@/components/sales/order-sidebar";
import { ProductGrid } from "@/components/sales/product-grid";
import { SalesHeader } from "@/components/sales/sales-header";
import { TicketPreviewDialog } from "@/components/sales/ticket-preview-dialog";
import { generateKitchenTicketPdf } from "@/lib/pdf/ticketJsPdf";
import { filterCompatibleHalfProducts } from "@/lib/halfAndHalf";
import { calculateOrderItemUnitPrice } from "../../../../../../lib/pricing/halfAndHalfPricing";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { useAuthStore } from "../../../../../store/authStore";
import { useOrderStore } from "../../../../../store/orderStore";
import { useProductsStore } from "../../../../../store/productsStore";
import { useSettingsStore } from "../../../../../store/settingsStore";

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


export default function OrdersPage() {
  const t = useTranslations("Orders");
  const { products, loading, error, fetchProducts } = useProductsStore(
    (state) => ({
      products: state.products,
      loading: state.loading,
      error: state.error,
      fetchProducts: state.fetchProducts,
    })
  );

  const { categories, halfAndHalfPricing, fetchSettings } = useSettingsStore((state) => ({
    categories: state.categories,
    halfAndHalfPricing: state.halfAndHalfPricing,
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
    customerName,
    setCustomerName,
  } = useOrderStore((state) => ({
    items: state.items,
    addItem: state.addItem,
    increaseQty: state.increaseQty,
    decreaseQty: state.decreaseQty,
    removeItem: state.removeItem,
    updateNotes: state.updateNotes,
    clearOrder: state.clearOrder,
    customerName: state.customerName,
    setCustomerName: state.setCustomerName,
  }));

  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [isFiltering, setIsFiltering] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  const [ticketDialogOpen, setTicketDialogOpen] = useState(false);
  const [ticketPreview, setTicketPreview] = useState(null);
  const [halfSelectorOpen, setHalfSelectorOpen] = useState(false);
  const [selectedHalfBaseProduct, setSelectedHalfBaseProduct] = useState(null);
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
      productId: item.id,
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
        body: JSON.stringify({ customerName }),
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
            ...getTenantHeader(),
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
          ...getTenantHeader(),
        },
        body: JSON.stringify({ customerName }),
      });
      if (!sendResponse.ok) {
        throw new Error(t("sendKitchenError"));
      }

      const ticketData = {
        orderNumber: normalizeOrderNumber(orderId),
        tableLabel: `${t("table")} / ${t("customer")}`,
        tableValue: customerName || t("walkInCustomer"),
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
        customerName,
        orderNotes: [],
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
      clearOrder();
    } catch (error) {
      setCheckoutError(error?.message || t("checkoutError"));
    } finally {
      isSubmittingRef.current = false;
      setIsSubmitting(false);
    }
  }, [items, buildItemPayload, clearOrder, customerName]);



  const compatibleHalfProducts = useMemo(
    () =>
      filterCompatibleHalfProducts({
        products,
        currentProduct: selectedHalfBaseProduct,
      }),
    [products, selectedHalfBaseProduct]
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
    [addItem, products]
  );

  const handleHalfAndHalfConfirm = useCallback(
    (secondHalfProduct) => {
      const baseProduct = selectedHalfBaseProduct;
      if (!baseProduct || !secondHalfProduct) {
        return;
      }

      const baseProductId = baseProduct?._id ?? baseProduct?.id;
      const secondHalfProductId = secondHalfProduct?._id ?? secondHalfProduct?.id;

      const halfUnitPrice = calculateOrderItemUnitPrice({
        isHalfAndHalf: true,
        priceA: Number(baseProduct?.price ?? 0),
        priceB: Number(secondHalfProduct?.price ?? 0),
        regularPrice: Number(baseProduct?.price ?? 0),
        pricingSettings: halfAndHalfPricing,
      });

      addItem(baseProduct);
      updateNotes(baseProductId, {
        isHalfAndHalf: true,
        halves: [{ productId: secondHalfProductId, name: secondHalfProduct?.name ?? "Product" }],
        price: halfUnitPrice,
      });

      setHalfSelectorOpen(false);
      setSelectedHalfBaseProduct(null);
    },
    [addItem, selectedHalfBaseProduct, updateNotes, halfAndHalfPricing]
  );
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
              onLongSelect={handleProductLongPress}
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
            customerName={customerName}
            onCustomerNameChange={setCustomerName}
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

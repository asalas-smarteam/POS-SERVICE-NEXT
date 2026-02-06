"use client";

import { useEffect, useMemo, useState } from "react";
import { CategoryTabs } from "@/components/sales/category-tabs";
import { OrderSidebar } from "@/components/sales/order-sidebar";
import { ProductGrid } from "@/components/sales/product-grid";
import { SalesHeader } from "@/components/sales/sales-header";
import { useOrderStore } from "../../../store/orderStore";
import { useProductsStore } from "../../../store/productsStore";
import { useSettingsStore } from "../../../store/settingsStore";

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
          />
        </div>
      </div>
    </div>
  );
}

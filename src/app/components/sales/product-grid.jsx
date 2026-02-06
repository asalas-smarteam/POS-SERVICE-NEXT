"use client";

import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { AppSpinner } from "@/components/app-spinner";
import { ProductCard } from "@/components/sales/product-card";

export function ProductGrid({
  products = [],
  loading = false,
  error = null,
  isFiltering = false,
  onSelect,
}) {
  if (loading) {
    return <AppSkeleton variant="grid" count={8} className="mt-4" />;
  }

  if (error) {
    return <AppAlert type="error" message={error} className="mt-4" />;
  }

  if (!products.length) {
    return (
      <AppAlert
        type="info"
        message="No hay productos disponibles para esta categoría."
        className="mt-4"
      />
    );
  }

  return (
    <div className="mt-4 space-y-4">
      {isFiltering ? (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <AppSpinner inline size={16} />
          Filtrando productos...
        </div>
      ) : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
        {products.map((product) => (
          <ProductCard
            key={product._id ?? product.id ?? product.name}
            product={product}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

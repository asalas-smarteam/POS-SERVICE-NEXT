"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Search, Table as TableIcon } from "lucide-react";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { ProductCard } from "@/components/products/product-card";
import { ProductDialog } from "@/components/products/product-dialog";
import { ProductTable } from "@/components/products/product-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useProductsStore } from "../../../store/productsStore";
import { useSettingsStore } from "../../../store/settingsStore";

const viewOptions = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "table", label: "Tabla", icon: TableIcon },
  { value: "list", label: "Lista", icon: List },
];

const formatResults = (total, term) => {
  if (!term) {
    return `${total} productos`;
  }
  return `${total} resultados para "${term}"`;
};

export default function ProductsPage() {
  const {
    products,
    loading,
    error,
    viewMode,
    searchTerm,
    categoryFilter,
    page,
    pageSize,
    fetchProducts,
    setViewMode,
    setSearchTerm,
    setCategoryFilter,
    setPage,
  } = useProductsStore((state) => ({
    products: state.products,
    loading: state.loading,
    error: state.error,
    viewMode: state.viewMode,
    searchTerm: state.searchTerm,
    categoryFilter: state.categoryFilter,
    page: state.page,
    pageSize: state.pageSize,
    fetchProducts: state.fetchProducts,
    setViewMode: state.setViewMode,
    setSearchTerm: state.setSearchTerm,
    setCategoryFilter: state.setCategoryFilter,
    setPage: state.setPage,
  }));

  const { categories, categoryLookup, settingsLoading, fetchSettings } =
    useSettingsStore((state) => ({
      categories: state.categories,
      categoryLookup: state.categoryLookup,
      settingsLoading: state.loading,
      fetchSettings: state.fetchSettings,
    }));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const resolveCategoryLabel = (product) => {
    if (!product?.categoryId) {
      return "Sin categoría";
    }
    return categoryLookup[product.categoryId] ?? product.categoryId;
  };

  const filteredProducts = useMemo(() => {
    const list = Array.isArray(products) ? products : [];
    const term = searchTerm.trim().toLowerCase();
    return list.filter((product) => {
      const matchesSearch = term
        ? product.name?.toLowerCase().includes(term)
        : true;
      if (!matchesSearch) {
        return false;
      }
      if (categoryFilter === "all") {
        return true;
      }
      if (categoryFilter === "uncategorized") {
        return !product.categoryId;
      }
      return product.categoryId === categoryFilter;
    });
  }, [products, searchTerm, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / pageSize));

  const currentPage = Math.min(page, totalPages);

  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page, setPage]);

  const handleCreate = () => {
    setEditingProduct(null);
    setDialogOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setActionAlert({
      type: "success",
      message: "Lista actualizada correctamente.",
    });
  };

  const renderContent = () => {
    if (loading) {
      return <AppSkeleton variant={viewMode === "table" ? "table" : viewMode} />;
    }

    if (error) {
      return <AppAlert type="error" message={error} />;
    }

    if (filteredProducts.length === 0) {
      return (
        <AppAlert
          type="info"
          message={
            searchTerm
              ? "No encontramos productos con ese nombre."
              : "Aún no hay productos registrados."
          }
        />
      );
    }

    if (viewMode === "table") {
      return (
        <ProductTable
          products={paginatedProducts}
          onEdit={handleEdit}
          getCategoryLabel={resolveCategoryLabel}
        />
      );
    }

    if (viewMode === "list") {
      return (
        <div className="space-y-3">
          {paginatedProducts.map((product) => (
            <Card key={product._id ?? product.name}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {product.type === "COMPOSED" ? "Compuesto" : "Simple"} · {product.ingredients?.length ?? 0} ingredientes
                  </p>
                </div>
                <Badge variant="secondary">{resolveCategoryLabel(product)}</Badge>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {Number(product.price || 0).toLocaleString("es-CL", {
                      style: "currency",
                      currency: "CLP",
                    })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleEdit(product)}>
                    Editar
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {paginatedProducts.map((product) => (
          <ProductCard
            key={product._id ?? product.name}
            product={product}
            onEdit={handleEdit}
            categoryLabel={resolveCategoryLabel(product)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Gestión de productos</h2>
            <p className="text-sm text-muted-foreground">
              Administra tu catálogo, crea productos y controla su composición.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 size-4" />
            Crear producto
          </Button>
        </div>

        {actionAlert ? (
          <AppAlert
            type={actionAlert.type}
            message={actionAlert.message}
            className="max-w-xl"
          />
        ) : null}

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nombre..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
              />
            </div>
            <div className="w-full max-w-xs">
              <Select
                value={categoryFilter}
                onValueChange={(value) => setCategoryFilter(value)}
                disabled={settingsLoading}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Todas las categorías" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="uncategorized">Sin categoría</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.label ?? category.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatResults(filteredProducts.length, searchTerm)}
              </span>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value)}
                variant="outline"
                spacing={0}
              >
                {viewOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
                      <Icon className="mr-2 size-4" />
                      {option.label}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
          </div>

          <div className="min-h-[200px]">{renderContent()}</div>

          <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
            <span className="text-xs text-muted-foreground">
              Página {currentPage} de {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        </div>
      </div>

      <ProductDialog
        open={dialogOpen}
        onOpenChange={(value) => {
          setDialogOpen(value);
          if (!value) {
            setEditingProduct(null);
          }
        }}
        product={editingProduct}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}

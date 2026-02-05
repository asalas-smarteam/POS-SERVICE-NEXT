"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Search, Table as TableIcon } from "lucide-react";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { IngredientCard } from "@/components/ingredients/ingredient-card";
import { IngredientDialog } from "@/components/ingredients/ingredient-dialog";
import { IngredientTable } from "@/components/ingredients/ingredient-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIngredientsStore } from "../../../store/ingredientsStore";

const viewOptions = [
  { value: "grid", label: "Grid", icon: LayoutGrid },
  { value: "table", label: "Tabla", icon: TableIcon },
  { value: "list", label: "Lista", icon: List },
];

const formatResults = (total, term) => {
  if (!term) {
    return `${total} ingredientes`;
  }
  return `${total} resultados para "${term}"`;
};

const unitLabelMap = {
  unit: "Unidad",
  g: "gramos",
  kg: "kilos",
};

const formatStock = (value) => {
  if (value === 0) {
    return "Sin stock";
  }
  return Number(value || 0).toLocaleString("es-CL");
};

export default function IngredientsPage() {
  const {
    ingredients,
    loading,
    error,
    viewMode,
    searchTerm,
    page,
    pageSize,
    actionLoading,
    fetchIngredients,
    setViewMode,
    setSearchTerm,
    setPage,
    deleteIngredient,
  } = useIngredientsStore((state) => ({
    ingredients: state.ingredients,
    loading: state.loading,
    error: state.error,
    viewMode: state.viewMode,
    searchTerm: state.searchTerm,
    page: state.page,
    pageSize: state.pageSize,
    actionLoading: state.actionLoading,
    fetchIngredients: state.fetchIngredients,
    setViewMode: state.setViewMode,
    setSearchTerm: state.setSearchTerm,
    setPage: state.setPage,
    deleteIngredient: state.deleteIngredient,
  }));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const filteredIngredients = useMemo(() => {
    const list = Array.isArray(ingredients) ? ingredients : [];
    const term = searchTerm.trim().toLowerCase();
    if (!term) {
      return list;
    }
    return list.filter((ingredient) =>
      ingredient.name?.toLowerCase().includes(term)
    );
  }, [ingredients, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredIngredients.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedIngredients = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredIngredients.slice(start, start + pageSize);
  }, [filteredIngredients, currentPage, pageSize]);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page, setPage]);

  const handleCreate = () => {
    setEditingIngredient(null);
    setDialogOpen(true);
  };

  const handleEdit = (ingredient) => {
    setEditingIngredient(ingredient);
    setDialogOpen(true);
  };

  const handleDialogSuccess = () => {
    setActionAlert({
      type: "success",
      message: "Lista actualizada correctamente.",
    });
  };

  const handleDelete = async (ingredient) => {
    if (!ingredient?._id) {
      return;
    }
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar "${ingredient.name}"?`
    );
    if (!confirmed) {
      return;
    }
    setDeletingId(ingredient._id);
    const result = await deleteIngredient(ingredient._id);
    if (result?.success) {
      setActionAlert({ type: "success", message: "Ingrediente eliminado." });
    } else {
      setActionAlert({
        type: "error",
        message: result?.message || "No se pudo eliminar el ingrediente.",
      });
    }
    setDeletingId(null);
  };

  const renderContent = () => {
    if (loading) {
      return <AppSkeleton variant={viewMode === "table" ? "table" : viewMode} />;
    }

    if (error) {
      return <AppAlert type="error" message={error} />;
    }

    if (filteredIngredients.length === 0) {
      return (
        <AppAlert
          type="info"
          message={
            searchTerm
              ? "No encontramos ingredientes con ese nombre."
              : "Aún no hay ingredientes registrados."
          }
        />
      );
    }

    if (viewMode === "table") {
      return (
        <IngredientTable
          ingredients={paginatedIngredients}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deletingId={deletingId}
        />
      );
    }

    if (viewMode === "list") {
      return (
        <div className="space-y-3">
          {paginatedIngredients.map((ingredient) => {
            const unitLabel = unitLabelMap[ingredient?.unit] ?? ingredient?.unit ?? "-";
            return (
              <Card key={ingredient._id ?? ingredient.name}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{ingredient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {unitLabel} · Stock {formatStock(ingredient.stock)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">
                      Stock mínimo {formatStock(ingredient.minStock)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ingredient)}>
                      Editar
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(ingredient)}
                      disabled={actionLoading && deletingId === ingredient._id}
                    >
                      Eliminar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {paginatedIngredients.map((ingredient) => (
          <IngredientCard
            key={ingredient._id ?? ingredient.name}
            ingredient={ingredient}
            onEdit={handleEdit}
            onDelete={handleDelete}
            deleting={actionLoading && deletingId === ingredient._id}
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
            <h2 className="text-lg font-semibold">Gestión de ingredientes</h2>
            <p className="text-sm text-muted-foreground">
              Administra los ingredientes, controla stock y define tus insumos clave.
            </p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 size-4" />
            Crear ingrediente
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
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatResults(filteredIngredients.length, searchTerm)}
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

      <IngredientDialog
        open={dialogOpen}
        onOpenChange={(value) => {
          setDialogOpen(value);
          if (!value) {
            setEditingIngredient(null);
          }
        }}
        ingredient={editingIngredient}
        onSuccess={handleDialogSuccess}
      />
    </div>
  );
}

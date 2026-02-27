"use client";

import { useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Plus, Search, Table as TableIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { IngredientCard } from "@/components/ingredients/ingredient-card";
import { IngredientDialog } from "@/components/ingredients/ingredient-dialog";
import { IngredientTable } from "@/components/ingredients/ingredient-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useIngredientsStore } from "../../../../../store/ingredientsStore";
import { useSettingsStore } from "../../../../../store/settingsStore";

const formatStock = (value, t) => {
  if (value === 0) {
    return t("stockOut");
  }
  return Number(value || 0).toLocaleString("es-CL");
};

export default function IngredientsPage() {
  const t = useTranslations("Ingredients");
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
  const { ingredientUnitLookup, fetchSettings } = useSettingsStore((state) => ({
    ingredientUnitLookup: state.ingredientUnitLookup,
    fetchSettings: state.fetchSettings,
  }));

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState(null);
  const [actionAlert, setActionAlert] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const viewOptions = [
    { value: "grid", label: t("grid"), icon: LayoutGrid },
    { value: "table", label: t("table"), icon: TableIcon },
    { value: "list", label: t("list"), icon: List },
  ];

  const formatResults = (total, term) => {
    if (!term) {
      return t("ingredientsCount", { total });
    }
    return t("results", { total, term });
  };

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const resolveUnitLabel = (unitId) => {
    if (!unitId) {
      return "-";
    }
    return ingredientUnitLookup[unitId] ?? unitId;
  };

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
      message: t("updatedList"),
    });
  };

  const handleDelete = async (ingredient) => {
    if (!ingredient?._id) {
      return;
    }
    const confirmed = window.confirm(
      t("confirmDeleteNamed", { name: ingredient.name })
    );
    if (!confirmed) {
      return;
    }
    setDeletingId(ingredient._id);
    const result = await deleteIngredient(ingredient._id);
    if (result?.success) {
      setActionAlert({ type: "success", message: t("deleted") });
    } else {
      setActionAlert({
        type: "error",
        message: result?.message || t("deleteError"),
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
          message={searchTerm ? t("noResultsSearch") : t("noIngredientsYet")}
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
          getUnitLabel={resolveUnitLabel}
        />
      );
    }

    if (viewMode === "list") {
      return (
        <div className="space-y-3">
          {paginatedIngredients.map((ingredient) => {
            const unitLabel = resolveUnitLabel(ingredient?.unit);
            return (
              <Card key={ingredient._id ?? ingredient.name}>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold">{ingredient.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {unitLabel} · {t("stock")} {formatStock(ingredient.stock, t)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="text-sm font-medium">
                      {t("minStock")} {formatStock(ingredient.minStock, t)}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(ingredient)}>
                      {t("editIngredient")}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(ingredient)}
                      disabled={actionLoading && deletingId === ingredient._id}
                    >
                      {t("deleteIngredient")}
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
            getUnitLabel={resolveUnitLabel}
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
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button onClick={handleCreate}>
            <Plus className="mr-2 size-4" />
            {t("createIngredient")}
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
                placeholder={t("searchByName")}
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
              {t("pageOf", { current: currentPage, total: totalPages })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                {t("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                {t("next")}
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

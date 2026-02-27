"use client";

import { useEffect, useState } from "react";
import { Boxes, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AppAlert } from "@/components/app-alert";
import { AppSpinner } from "@/components/app-spinner";
import { useIngredientsStore } from "../../../store/ingredientsStore";
import { useSettingsStore } from "../../../store/settingsStore";

const emptyForm = {
  name: "",
  unit: "unit",
  stock: "",
  minStock: "",
};

export function IngredientDialog({ open, onOpenChange, ingredient, onSuccess }) {
  const t = useTranslations("Ingredients");
  const {
    actionLoading,
    createIngredient,
    updateIngredient,
  } = useIngredientsStore((state) => ({
    actionLoading: state.actionLoading,
    createIngredient: state.createIngredient,
    updateIngredient: state.updateIngredient,
  }));
  const {
    ingredientUnits,
    ingredientUnitLookup,
    fetchSettings,
  } = useSettingsStore((state) => ({
    ingredientUnits: state.ingredientUnits,
    ingredientUnitLookup: state.ingredientUnitLookup,
    fetchSettings: state.fetchSettings,
  }));

  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState(null);

  const isEditing = Boolean(ingredient?._id);

  useEffect(() => {
    if (open) {
      fetchSettings();
    }
  }, [open, fetchSettings]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setAlert(null);
      return;
    }

    if (ingredient) {
      setForm({
        name: ingredient?.name ?? "",
        unit: ingredient?.unit ?? "unit",
        stock: ingredient?.stock ?? "",
        minStock: ingredient?.minStock ?? "",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, ingredient]);

  const unitOptions = Array.isArray(ingredientUnits)
    ? ingredientUnits.map((unit) => ({
        value: unit?.id,
        label: unit?.label ?? unit?.id,
      }))
    : [];

  const normalizedUnitOptions =
    form.unit && !unitOptions.some((option) => option.value === form.unit)
      ? [
          ...unitOptions,
          {
            value: form.unit,
            label: ingredientUnitLookup[form.unit] ?? form.unit,
          },
        ]
      : unitOptions;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAlert(null);

    const payload = {
      name: form.name.trim(),
      unit: form.unit,
      stock: Number(form.stock) || 0,
      minStock: Number(form.minStock) || 0,
    };

    if (!payload.name) {
      setAlert({ type: "error", message: t("completeName") });
      return;
    }

    const result = isEditing
      ? await updateIngredient(ingredient._id, payload)
      : await createIngredient(payload);

    if (result?.success) {
      setAlert({ type: "success", message: t("savedSuccessfully") });
      onSuccess?.();
      onOpenChange?.(false);
    } else {
      setAlert({
        type: "error",
        message: result?.message || t("saveError"),
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="size-5 text-muted-foreground" />
            {isEditing ? t("editIngredient") : t("createIngredient")}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? t("editSelectedIngredient") : t("createIngredientDescription")}
          </DialogDescription>
        </DialogHeader>

        {alert ? <AppAlert type={alert.type} message={alert.message} /> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ingredient-name">{t("name")}</Label>
              <Input
                id="ingredient-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ej: Borde"
              />
            </div>
            <div className="space-y-2">
              <Label>{t("unit")}</Label>
              <Select
                value={form.unit}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    unit: value,
                  }))
                }
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectUnit")} />
                </SelectTrigger>
                <SelectContent>
                  {normalizedUnitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ingredient-stock">{t("stock")}</Label>
              <Input
                id="ingredient-stock"
                type="number"
                min="0"
                value={form.stock}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    stock: event.target.value,
                  }))
                }
                placeholder="Ej: 5000"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ingredient-min-stock">{t("minStock")}</Label>
              <Input
                id="ingredient-min-stock"
                type="number"
                min="0"
                value={form.minStock}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    minStock: event.target.value,
                  }))
                }
                placeholder="Ej: 500"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              disabled={actionLoading}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <AppSpinner size={16} inline />
                  {t("saving")}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="size-4" />
                  {t("save")}
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

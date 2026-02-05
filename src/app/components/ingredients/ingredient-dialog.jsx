"use client";

import { useEffect, useState } from "react";
import { Boxes, Plus } from "lucide-react";
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

const unitOptions = [
  { value: "unit", label: "Unidad" },
  { value: "g", label: "gramos" },
  { value: "kg", label: "kilos" },
];

const emptyForm = {
  name: "",
  unit: "unit",
  stock: "",
  minStock: "",
};

export function IngredientDialog({ open, onOpenChange, ingredient, onSuccess }) {
  const {
    actionLoading,
    createIngredient,
    updateIngredient,
  } = useIngredientsStore((state) => ({
    actionLoading: state.actionLoading,
    createIngredient: state.createIngredient,
    updateIngredient: state.updateIngredient,
  }));

  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState(null);

  const isEditing = Boolean(ingredient?._id);

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
      setAlert({ type: "error", message: "Completa el nombre del ingrediente." });
      return;
    }

    const result = isEditing
      ? await updateIngredient(ingredient._id, payload)
      : await createIngredient(payload);

    if (result?.success) {
      setAlert({ type: "success", message: "Ingrediente guardado correctamente." });
      onSuccess?.();
      onOpenChange?.(false);
    } else {
      setAlert({
        type: "error",
        message: result?.message || "No se pudo guardar el ingrediente.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Boxes className="size-5 text-muted-foreground" />
            {isEditing ? "Editar ingrediente" : "Crear ingrediente"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del ingrediente seleccionado."
              : "Completa la información para registrar un nuevo ingrediente."}
          </DialogDescription>
        </DialogHeader>

        {alert ? <AppAlert type={alert.type} message={alert.message} /> : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="ingredient-name">Nombre</Label>
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
              <Label>Unidad</Label>
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
                  <SelectValue placeholder="Selecciona una unidad" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((option) => (
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
              <Label htmlFor="ingredient-stock">Stock</Label>
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
              <Label htmlFor="ingredient-min-stock">Stock mínimo</Label>
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
              Cancelar
            </Button>
            <Button type="submit" disabled={actionLoading}>
              {actionLoading ? (
                <span className="flex items-center gap-2">
                  <AppSpinner size={16} inline />
                  Guardando...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Plus className="size-4" />
                  Guardar
                </span>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useProductsStore } from "../../../store/productsStore";

const emptyForm = {
  name: "",
  price: "",
  type: "SIMPLE",
  ingredients: [],
};

const normalizeIngredients = (ingredients = []) =>
  ingredients.map((item) => {
    const ingredient = item?.ingredientId ?? {};
    return {
      ingredientId: ingredient?._id ?? item?.ingredientId,
      name: ingredient?.name ?? item?.name ?? "Ingrediente",
      quantity: item?.quantity ?? 1,
    };
  });

export function ProductDialog({ open, onOpenChange, product, onSuccess }) {
  const {
    ingredients,
    fetchIngredients,
    actionLoading,
    createProduct,
    updateProduct,
  } = useProductsStore((state) => ({
    ingredients: state.ingredients,
    fetchIngredients: state.fetchIngredients,
    actionLoading: state.actionLoading,
    createProduct: state.createProduct,
    updateProduct: state.updateProduct,
  }));

  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState(null);
  const [selectValue, setSelectValue] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");

  const isEditing = Boolean(product?._id);

  useEffect(() => {
    if (open) {
      fetchIngredients();
    }
  }, [open, fetchIngredients]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setAlert(null);
      setSelectValue("");
      setIngredientSearch("");
      return;
    }

    if (product) {
      setForm({
        name: product?.name ?? "",
        price: product?.price ?? "",
        type: product?.type ?? "SIMPLE",
        ingredients: normalizeIngredients(product?.ingredients ?? []),
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, product]);

  const selectedIngredientIds = useMemo(
    () => new Set(form.ingredients.map((item) => item.ingredientId)),
    [form.ingredients]
  );

  const availableIngredients = useMemo(() => {
    const normalized = Array.isArray(ingredients) ? ingredients : [];
    return normalized.filter(
      (ingredient) => !selectedIngredientIds.has(ingredient._id)
    );
  }, [ingredients, selectedIngredientIds]);

  const filteredIngredients = useMemo(() => {
    const term = ingredientSearch.trim().toLowerCase();
    if (!term) {
      return availableIngredients;
    }
    return availableIngredients.filter((ingredient) =>
      ingredient.name?.toLowerCase().includes(term)
    );
  }, [availableIngredients, ingredientSearch]);

  const handleIngredientSelect = (value) => {
    const found = availableIngredients.find((item) => item._id === value);
    if (!found) {
      return;
    }
    setForm((current) => ({
      ...current,
      ingredients: [
        ...current.ingredients,
        { ingredientId: found._id, name: found.name, quantity: 1 },
      ],
    }));
    setSelectValue("");
    setIngredientSearch("");
  };

  const handleIngredientQuantity = (ingredientId, quantity) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.map((item) =>
        item.ingredientId === ingredientId
          ? { ...item, quantity }
          : item
      ),
    }));
  };

  const handleRemoveIngredient = (ingredientId) => {
    setForm((current) => ({
      ...current,
      ingredients: current.ingredients.filter(
        (item) => item.ingredientId !== ingredientId
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setAlert(null);

    const payload = {
      name: form.name.trim(),
      price: Number(form.price),
      type: form.type,
    };

    if (form.type === "COMPOSED") {
      payload.ingredients = form.ingredients.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: Number(item.quantity) || 0,
      }));
    }

    if (!payload.name || !payload.price) {
      setAlert({ type: "error", message: "Completa nombre y precio." });
      return;
    }

    const result = isEditing
      ? await updateProduct(product._id, payload)
      : await createProduct(payload);

    if (result?.success) {
      setAlert({ type: "success", message: "Producto guardado correctamente." });
      onSuccess?.();
      onOpenChange?.(false);
    } else {
      setAlert({
        type: "error",
        message: result?.message || "No se pudo guardar el producto.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-muted-foreground" />
            {isEditing ? "Editar producto" : "Crear producto"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Actualiza los datos del producto seleccionado."
              : "Completa la información para registrar un nuevo producto."}
          </DialogDescription>
        </DialogHeader>

        {alert ? (
          <AppAlert type={alert.type} message={alert.message} />
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">Nombre</Label>
              <Input
                id="product-name"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value,
                  }))
                }
                placeholder="Ej: Coca Cola"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="product-price">Precio</Label>
              <Input
                id="product-price"
                type="number"
                min="0"
                value={form.price}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    price: event.target.value,
                  }))
                }
                placeholder="Ej: 1200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Tipo de producto</Label>
            <Select
              value={form.type}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  type: value,
                  ingredients: value === "COMPOSED" ? current.ingredients : [],
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona el tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIMPLE">Simple</SelectItem>
                <SelectItem value="COMPOSED">Compuesto</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {form.type === "COMPOSED" ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ingredientes</p>
                  <p className="text-xs text-muted-foreground">
                    Agrega ingredientes y define la cantidad necesaria.
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {form.ingredients.length} seleccionados
                </span>
              </div>

              <div className="space-y-2">
                <Label>Agregar ingrediente</Label>
                <Select
                  value={selectValue}
                  onValueChange={(value) => {
                    setSelectValue(value);
                    handleIngredientSelect(value);
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecciona un ingrediente" />
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2">
                      <Input
                        value={ingredientSearch}
                        onChange={(event) => setIngredientSearch(event.target.value)}
                        placeholder="Buscar ingrediente..."
                        onKeyDown={(event) => event.stopPropagation()}
                      />
                    </div>
                    {filteredIngredients.length > 0 ? (
                      filteredIngredients.map((ingredient) => (
                        <SelectItem key={ingredient._id} value={ingredient._id}>
                          {ingredient.name}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="px-3 py-2 text-xs text-muted-foreground">
                        Sin resultados.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                {form.ingredients.length === 0 ? (
                  <div className="rounded-md border border-dashed px-4 py-3 text-xs text-muted-foreground">
                    No hay ingredientes agregados.
                  </div>
                ) : (
                  form.ingredients.map((ingredient) => (
                    <div
                      key={ingredient.ingredientId}
                      className={cn(
                        "flex flex-col gap-3 rounded-md border p-3",
                        "sm:flex-row sm:items-center sm:justify-between"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{ingredient.name}</p>
                        <p className="text-xs text-muted-foreground">
                          ID: {ingredient.ingredientId}
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="flex items-center gap-2">
                          <Label className="text-xs">Cantidad</Label>
                          <Input
                            type="number"
                            min="0"
                            className="h-8 w-24"
                            value={ingredient.quantity}
                            onChange={(event) =>
                              handleIngredientQuantity(
                                ingredient.ingredientId,
                                event.target.value
                              )
                            }
                          />
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => handleRemoveIngredient(ingredient.ingredientId)}
                        >
                          <Trash2 className="size-4" />
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : null}

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

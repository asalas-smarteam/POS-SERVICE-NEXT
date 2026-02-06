"use client";

import { useEffect, useMemo, useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { AppSpinner } from "@/components/app-spinner";
import { IngredientSearchSelect } from "@/components/ingredients/ingredient-search-select";
import { cn } from "@/lib/utils";
import { useIngredientsStore } from "../../../store/ingredientsStore";

const normalizeBaseIngredients = (ingredients = []) =>
  ingredients
    .map((item) => {
      const ingredient = item?.ingredientId ?? {};
      const ingredientId = ingredient?._id ?? item?.ingredientId;
      if (!ingredientId) {
        return null;
      }
      return {
        ingredientId,
        name: ingredient?.name ?? item?.name ?? "Ingrediente",
        quantity: Number(item?.quantity ?? 1),
      };
    })
    .filter(Boolean);

// Construye notas legibles siguiendo las reglas de cantidades base/extras.
const buildNotes = (modifiers = []) =>
  modifiers.flatMap((modifier) => {
    const baseQuantity = Number(modifier.baseQuantity ?? 0);
    const quantity = Number(modifier.quantity ?? 0);
    const name = modifier.name?.toLowerCase();
    if (!name) {
      return [];
    }
    if (baseQuantity > 0) {
      if (quantity === 0) {
        return [`quitar ${name}`];
      }
      if (quantity > baseQuantity) {
        return [`extra ${name}`];
      }
      return [];
    }
    if (quantity > 0) {
      return [`extra ${name}`];
    }
    return [];
  });

export function OrderItemNotesDialog({ open, onOpenChange, item, onSave }) {
  const { ingredients, loading, fetchIngredients } = useIngredientsStore((state) => ({
    ingredients: state.ingredients,
    loading: state.loading,
    fetchIngredients: state.fetchIngredients,
  }));

  const [modifiers, setModifiers] = useState([]);
  const [selectValue, setSelectValue] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [extraQuantity, setExtraQuantity] = useState("1");

  const baseIngredients = useMemo(() => {
    return normalizeBaseIngredients(item?.baseIngredients ?? item?.ingredients ?? []);
  }, [item]);

  const baseIngredientIds = useMemo(
    () => new Set(baseIngredients.map((ingredient) => ingredient.ingredientId)),
    [baseIngredients]
  );

  useEffect(() => {
    if (open) {
      fetchIngredients();
    }
  }, [open, fetchIngredients]);

  useEffect(() => {
    if (!open) {
      setSelectValue("");
      setIngredientSearch("");
      setExtraQuantity("1");
      return;
    }

    const existingModifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];
    const baseMap = new Map(
      baseIngredients.map((ingredient) => [ingredient.ingredientId, ingredient])
    );

    const merged = baseIngredients.map((ingredient) => {
      const existing = existingModifiers.find(
        (modifier) => modifier.ingredientId === ingredient.ingredientId
      );
      return {
        ingredientId: ingredient.ingredientId,
        name: ingredient.name,
        baseQuantity: ingredient.quantity,
        quantity: Number(existing?.quantity ?? ingredient.quantity),
        isExtra: false,
      };
    });

    const extras = existingModifiers
      .filter((modifier) => !baseMap.has(modifier.ingredientId))
      .map((modifier) => ({
        ingredientId: modifier.ingredientId,
        name: modifier.name ?? "Ingrediente",
        baseQuantity: 0,
        quantity: Number(modifier.quantity ?? 0),
        isExtra: true,
      }))
      .filter((modifier) => modifier.quantity > 0);

    setModifiers([...merged, ...extras]);
  }, [open, item, baseIngredients]);

  const availableExtras = useMemo(() => {
    const list = Array.isArray(ingredients) ? ingredients : [];
    return list.filter((ingredient) => !baseIngredientIds.has(ingredient._id));
  }, [ingredients, baseIngredientIds]);

  const filteredExtras = useMemo(() => {
    const term = ingredientSearch.trim().toLowerCase();
    if (!term) {
      return availableExtras;
    }
    return availableExtras.filter((ingredient) =>
      ingredient.name?.toLowerCase().includes(term)
    );
  }, [availableExtras, ingredientSearch]);

  const notesPreview = useMemo(() => buildNotes(modifiers), [modifiers]);

  const sortedModifiers = useMemo(() => {
    const baseList = modifiers.filter((modifier) =>
      baseIngredientIds.has(modifier.ingredientId)
    );
    const extraList = modifiers.filter(
      (modifier) => !baseIngredientIds.has(modifier.ingredientId)
    );
    return [...baseList, ...extraList];
  }, [modifiers, baseIngredientIds]);

  const handleAdjustQuantity = (ingredientId, delta) => {
    setModifiers((current) =>
      current
        .map((modifier) => {
          if (modifier.ingredientId !== ingredientId) {
            return modifier;
          }
          const nextQuantity = Math.max(0, Number(modifier.quantity ?? 0) + delta);
          return { ...modifier, quantity: nextQuantity };
        })
        .filter((modifier) =>
          modifier.baseQuantity > 0 ? true : modifier.quantity > 0
        )
    );
  };

  const handleAddExtra = () => {
    const ingredient = availableExtras.find(
      (option) => option._id === selectValue
    );
    if (!ingredient) {
      return;
    }
    const qty = Math.max(1, Number(extraQuantity) || 1);

    setModifiers((current) => {
      const existing = current.find(
        (modifier) => modifier.ingredientId === ingredient._id
      );
      if (existing) {
        return current.map((modifier) =>
          modifier.ingredientId === ingredient._id
            ? { ...modifier, quantity: modifier.quantity + qty }
            : modifier
        );
      }
      return [
        ...current,
        {
          ingredientId: ingredient._id,
          name: ingredient.name ?? "Ingrediente",
          baseQuantity: 0,
          quantity: qty,
          isExtra: true,
        },
      ];
    });

    setSelectValue("");
    setIngredientSearch("");
    setExtraQuantity("1");
  };

  const handleSave = () => {
    onSave?.(item.id, {
      notes: notesPreview,
      modifiers,
    });
    onOpenChange?.(false);
  };

  const hasBaseIngredients = baseIngredients.length > 0;
  const isLoadingIngredients = loading && ingredients.length === 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Personalizar producto</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!hasBaseIngredients ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Este producto no tiene ingredientes configurados. Puedes agregar
                extras.
              </p>
              {sortedModifiers.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">Extras agregados</p>
                  <ScrollArea className="h-[180px] pr-3">
                    <div className="space-y-2">
                      {sortedModifiers.map((modifier) => (
                        <div
                          key={modifier.ingredientId}
                          className={cn(
                            "flex items-center justify-between rounded-md border px-3 py-2",
                            "bg-muted/40"
                          )}
                        >
                          <div>
                            <p className="text-sm font-medium">{modifier.name}</p>
                            <p className="text-xs text-muted-foreground">Extra</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleAdjustQuantity(modifier.ingredientId, -1)
                              }
                              aria-label={`Quitar ${modifier.name}`}
                            >
                              <Minus className="size-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-semibold">
                              {modifier.quantity}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                handleAdjustQuantity(modifier.ingredientId, 1)
                              }
                              aria-label={`Agregar ${modifier.name}`}
                            >
                              <Plus className="size-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ingredientes base</p>
                  <p className="text-xs text-muted-foreground">
                    Ajusta cantidades para quitar o agregar extras.
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {baseIngredients.length} ingredientes
                </span>
              </div>
              <ScrollArea className="h-[220px] pr-3">
                <div className="space-y-2">
                  {sortedModifiers.map((modifier) => (
                    <div
                      key={modifier.ingredientId}
                      className={cn(
                        "flex items-center justify-between rounded-md border px-3 py-2",
                        modifier.baseQuantity === 0 && "bg-muted/40"
                      )}
                    >
                      <div>
                        <p className="text-sm font-medium">{modifier.name}</p>
                        {modifier.baseQuantity === 0 ? (
                          <p className="text-xs text-muted-foreground">Extra</p>
                        ) : null}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleAdjustQuantity(modifier.ingredientId, -1)
                          }
                          aria-label={`Quitar ${modifier.name}`}
                        >
                          <Minus className="size-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-semibold">
                          {modifier.quantity}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() =>
                            handleAdjustQuantity(modifier.ingredientId, 1)
                          }
                          aria-label={`Agregar ${modifier.name}`}
                        >
                          <Plus className="size-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">Agregar extra</p>
              <p className="text-xs text-muted-foreground">
                Selecciona ingredientes adicionales que no pertenecen al
                producto.
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="flex-1 space-y-2">
                <IngredientSearchSelect
                  value={selectValue}
                  onValueChange={setSelectValue}
                  searchValue={ingredientSearch}
                  onSearchChange={setIngredientSearch}
                  items={isLoadingIngredients ? [] : filteredExtras}
                  placeholder="Selecciona un ingrediente extra"
                  emptyMessage={
                    isLoadingIngredients
                      ? "Cargando ingredientes..."
                      : "Sin resultados."
                  }
                />
              </div>
              <div className="w-full space-y-2 sm:w-28">
                <Input
                  type="number"
                  min="1"
                  value={extraQuantity}
                  onChange={(event) => setExtraQuantity(event.target.value)}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                className="sm:mb-[2px]"
                onClick={handleAddExtra}
                disabled={!selectValue || isLoadingIngredients}
              >
                {isLoadingIngredients ? (
                  <span className="flex items-center gap-2">
                    <AppSpinner size={14} inline />
                    Cargando...
                  </span>
                ) : (
                  "Agregar"
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">Notas</p>
            {notesPreview.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {notesPreview.map((note, index) => (
                  <li key={`${note}-${index}`}>- {note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                No hay notas generadas.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange?.(false)}
          >
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave}>
            Guardar cambios
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

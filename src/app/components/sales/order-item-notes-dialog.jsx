"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AppSpinner } from "@/components/app-spinner";
import { IngredientSearchSelect } from "@/components/ingredients/ingredient-search-select";
import { filterCompatibleHalfProducts } from "@/lib/halfAndHalf";
import { calculateOrderItemUnitPrice } from "@/lib/pricing/halfAndHalfPricing";
import { cn } from "@/lib/utils";
import { useIngredientsStore } from "../../../store/ingredientsStore";
import { useProductsStore } from "../../../store/productsStore";
import { useSettingsStore } from "../../../store/settingsStore";

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
        name: ingredient?.name ?? item?.name ?? "Ingredient",
        quantity: Number(item?.quantity ?? 1),
      };
    })
    .filter(Boolean);

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
        return [`remove ${name}`];
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
  const t = useTranslations("Orders");
  const { ingredients, loading, fetchIngredients } = useIngredientsStore((state) => ({
    ingredients: state.ingredients,
    loading: state.loading,
    fetchIngredients: state.fetchIngredients,
  }));

  const { products, fetchProducts } = useProductsStore((state) => ({
    products: state.products,
    fetchProducts: state.fetchProducts,
  }));

  const { halfAndHalfPricing } = useSettingsStore((state) => ({
    halfAndHalfPricing: state.halfAndHalfPricing,
  }));

  const [modifiers, setModifiers] = useState([]);
  const [selectValue, setSelectValue] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [extraQuantity, setExtraQuantity] = useState("1");
  const [isHalfAndHalf, setIsHalfAndHalf] = useState(false);
  const [selectedHalfProductId, setSelectedHalfProductId] = useState("");
  const [cashierNote, setCashierNote] = useState("");

  const baseIngredients = useMemo(() => {
    return normalizeBaseIngredients(item?.baseIngredients ?? item?.ingredients ?? []);
  }, [item]);

  const baseIngredientIds = useMemo(
    () => new Set(baseIngredients.map((ingredient) => ingredient.ingredientId)),
    [baseIngredients]
  );

  const canConfigureHalfAndHalf = Boolean(item?.allowsHalf);

  useEffect(() => {
    if (open) {
      fetchIngredients();
      if (canConfigureHalfAndHalf && (!Array.isArray(products) || products.length === 0)) {
        fetchProducts();
      }
    }
  }, [open, fetchIngredients, canConfigureHalfAndHalf, products, fetchProducts]);

  useEffect(() => {
    if (!open) {
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
        name: modifier.name ?? t("unknownProduct"),
        baseQuantity: 0,
        quantity: Number(modifier.quantity ?? 0),
        isExtra: true,
      }))
      .filter((modifier) => modifier.quantity > 0);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setModifiers([...merged, ...extras]);

    const initialHalfEnabled = Boolean(item?.isHalfAndHalf) && canConfigureHalfAndHalf;
    const initialHalfProductId = initialHalfEnabled
      ? item?.halves?.[0]?.productId ?? ""
      : "";

    setIsHalfAndHalf(initialHalfEnabled);
    setSelectedHalfProductId(initialHalfProductId);
    setCashierNote(typeof item?.note === "string" ? item.note : "");
  }, [open, item, baseIngredients, canConfigureHalfAndHalf]);

  const compatibleHalfProducts = useMemo(
    () => filterCompatibleHalfProducts({ products, currentProduct: item }),
    [products, item]
  );

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

  const resetDialogState = () => {
    setSelectValue("");
    setIngredientSearch("");
    setExtraQuantity("1");
    setIsHalfAndHalf(false);
    setSelectedHalfProductId("");
    setCashierNote("");
  };

  const handleDialogOpenChange = (nextOpen) => {
    if (!nextOpen) {
      resetDialogState();
    }
    onOpenChange?.(nextOpen);
  };

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
          name: ingredient.name ?? t("unknownProduct"),
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

  const handleHalfAndHalfChange = (checked) => {
    const nextChecked = Boolean(checked);
    setIsHalfAndHalf(nextChecked);
    if (!nextChecked) {
      setSelectedHalfProductId("");
    }
  };

  const handleSave = () => {
    const selectedHalfProduct = compatibleHalfProducts.find(
      (product) => product._id === selectedHalfProductId
    );

    const unitPrice = calculateOrderItemUnitPrice({
      isHalfAndHalf,
      priceA: Number(item?.basePrice ?? item?.price ?? 0),
      priceB: Number(selectedHalfProduct?.price ?? 0),
      regularPrice: Number(item?.basePrice ?? item?.price ?? 0),
      pricingSettings: halfAndHalfPricing,
    });

    onSave?.(item.id, {
      modifierNotes: notesPreview,
      note: cashierNote,
      modifiers,
      isHalfAndHalf,
      halves:
        isHalfAndHalf && selectedHalfProduct
          ? [
              {
                productId: selectedHalfProduct._id,
                productName: selectedHalfProduct.name,
              },
            ]
          : [],
      price: unitPrice,
    });
    handleDialogOpenChange(false);
  };

  const hasBaseIngredients = baseIngredients.length > 0;
  const isLoadingIngredients = loading && ingredients.length === 0;
  const hasCompatibleHalfProducts = compatibleHalfProducts.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("editOrderItem")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {!hasBaseIngredients ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {t("noConfiguredIngredients")}
              </p>
              {sortedModifiers.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-medium">{t("addedExtras")}</p>
                  <ScrollArea className="h-[140px] pr-3 sm:h-[180px]">
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
                            <p className="text-xs text-muted-foreground">{t("extra")}</p>
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
                              aria-label={`${t("remove")} ${modifier.name}`}
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
                              aria-label={`${t("add")} ${modifier.name}`}
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
                  <p className="text-sm font-medium">{t("baseIngredients")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("adjustIngredients")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("ingredientsCount", { count: baseIngredients.length })}
                </span>
              </div>
              <ScrollArea className="h-[160px] pr-3 sm:h-[220px]">
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
                          <p className="text-xs text-muted-foreground">{t("extra")}</p>
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
                          aria-label={`${t("remove")} ${modifier.name}`}
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
                          aria-label={`${t("add")} ${modifier.name}`}
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

          {canConfigureHalfAndHalf ? (
            <>
              <Separator />

              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{t("halfAndHalfConfiguration")}</p>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`half-and-half-${item?.id}`}
                    checked={isHalfAndHalf}
                    onCheckedChange={handleHalfAndHalfChange}
                  />
                  <Label htmlFor={`half-and-half-${item?.id}`}>{t("halfAndHalf")}</Label>
                </div>

                {isHalfAndHalf ? (
                  <div className="space-y-2">
                    <Label htmlFor={`half-product-${item?.id}`}>{t("selectSecondProduct")}</Label>
                    <Select
                      value={selectedHalfProductId}
                      onValueChange={setSelectedHalfProductId}
                      disabled={!hasCompatibleHalfProducts}
                    >
                      <SelectTrigger id={`half-product-${item?.id}`}>
                        <SelectValue placeholder={t("chooseCompatibleProduct")} />
                      </SelectTrigger>
                      <SelectContent>
                        {compatibleHalfProducts.map((product) => (
                          <SelectItem key={product._id} value={product._id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {!hasCompatibleHalfProducts ? (
                      <p className="text-sm text-muted-foreground">
                        {t("noCompatibleHalfProducts")}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </>
          ) : null}

          <Separator />

          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium">{t("addExtra")}</p>
              <p className="text-xs text-muted-foreground">
                {t("selectAdditionalIngredients")}
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
                  placeholder={t("selectExtraIngredient")}
                  emptyMessage={
                    isLoadingIngredients
                      ? t("loadingIngredients")
                      : t("noResults")
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
                    {t("loading")}
                  </span>
                ) : (
                  t("add")
                )}
              </Button>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor={`cashier-note-${item?.id}`}>{t("cashierNote")}</Label>
            <textarea
              id={`cashier-note-${item?.id}`}
              className="min-h-[88px] w-full rounded-md border bg-background px-3 py-2 text-sm"
              placeholder={t("cashierNotePlaceholder")}
              value={cashierNote}
              onChange={(event) => setCashierNote(event.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <p className="text-sm font-medium">{t("toppingsModifiers")}</p>
            {notesPreview.length > 0 ? (
              <ul className="space-y-1 text-sm text-muted-foreground">
                {notesPreview.map((note, index) => (
                  <li key={`${note}-${index}`}>- {note}</li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("noModifierChanges")}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleDialogOpenChange(false)}
          >
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleSave}>
            {t("saveChanges")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

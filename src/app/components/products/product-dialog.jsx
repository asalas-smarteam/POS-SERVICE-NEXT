"use client";

import { useEffect, useMemo, useState } from "react";
import { Package, Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { IngredientSearchSelect } from "@/components/ingredients/ingredient-search-select";
import { useProductsStore } from "../../../store/productsStore";
import { useProductSizesStore } from "../../../store/productSizesStore";
import { useSettingsStore } from "../../../store/settingsStore";

const emptyForm = {
  name: "",
  price: "",
  type: "SIMPLE",
  ingredients: [],
  categoryId: "",
  sizeId: "",
  allowsHalf: false,
  productSizeId: "",
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

export function ProductDialog({ open, onOpenChange, product, duplicateFrom, onSuccess }) {
  const t = useTranslations("Products");
  const tType = useTranslations("ProductTypes");
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

  const { categories, productSizes, settingsLoading, fetchSettings } = useSettingsStore(
    (state) => ({
      categories: state.categories,
      productSizes: state.sizes,
      settingsLoading: state.loading,
      fetchSettings: state.fetchSettings,
    })
  );

  const { sizes, sizesLoading, fetchSizes } = useProductSizesStore((state) => ({
    sizes: state.sizes,
    sizesLoading: state.loading,
    fetchSizes: state.fetchSizes,
  }));

  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState(null);
  const [selectValue, setSelectValue] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");

  const isEditing = Boolean(product?._id);
  const isDuplicating = !isEditing && Boolean(duplicateFrom);

  useEffect(() => {
    if (open) {
      fetchIngredients();
      fetchSettings();
      fetchSizes();
    }
  }, [open, fetchIngredients, fetchSettings, fetchSizes]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setAlert(null);
      setSelectValue("");
      setIngredientSearch("");
      return;
    }

    const source = product ?? duplicateFrom;

    if (source) {
      setForm({
        name: source?.name ?? "",
        price: source?.price ?? "",
        type: source?.type ?? "SIMPLE",
        ingredients: normalizeIngredients(source?.ingredients ?? []),
        categoryId: source?.categoryId ?? "",
        sizeId: source?.sizeId?._id ?? source?.sizeId ?? "",
        allowsHalf: Boolean(source?.allowsHalf),
        productSizeId: source?.productSizeId ?? "",
      });
    } else {
      const defaultSize = Array.isArray(sizes)
        ? sizes.find((size) => size?.isDefault === true)
        : null;

      setForm({
        ...emptyForm,
        sizeId: defaultSize?._id ?? "",
      });
    }
  }, [open, product, duplicateFrom, sizes]);

  useEffect(() => {
    if (!open || isEditing || isDuplicating || form.categoryId) {
      return;
    }
    const defaultCategory = categories.find((category) => category?.id === "bebidas");
    if (defaultCategory?.id) {
      setForm((current) => ({ ...current, categoryId: defaultCategory.id }));
    }
  }, [categories, form.categoryId, isEditing, isDuplicating, open]);

  const categorySizes = useMemo(() => {
    const selectedCategory = categories.find((category) => category?.id === form.categoryId);
    const enabledSizeIds = Array.isArray(selectedCategory?.sizeIds) ? selectedCategory.sizeIds : [];
    return productSizes.filter((size) => enabledSizeIds.includes(size.id));
  }, [categories, form.categoryId, productSizes]);

  const requiresProductSize = categorySizes.length > 0;

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
      sizeId: form.sizeId || null,
      allowsHalf: Boolean(form.allowsHalf),
      productSizeId: form.productSizeId || null,
    };

    if (form.type === "COMPOSED") {
      payload.ingredients = form.ingredients.map((item) => ({
        ingredientId: item.ingredientId,
        quantity: Number(item.quantity) || 0,
      }));
    }

    if (form.categoryId) {
      payload.categoryId = form.categoryId;
    }

    if (!payload.name || !payload.price) {
      setAlert({ type: "error", message: t("completeNameAndPrice") });
      return;
    }

    if (requiresProductSize && !payload.productSizeId) {
      setAlert({ type: "error", message: t("completeProductSize") });
      return;
    }

    const result = isEditing
      ? await updateProduct(product._id, payload)
      : await createProduct(payload);

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
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="size-5 text-muted-foreground" />
            {isEditing ? t("editProduct") : isDuplicating ? t("duplicateProduct") : t("createProduct")}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("editSelectedProduct")
              : isDuplicating
                ? t("duplicateProductDescription")
                : t("createProductDescription")}
          </DialogDescription>
        </DialogHeader>

        {alert ? (
          <AppAlert type={alert.type} message={alert.message} />
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="product-name">{t("name")}</Label>
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
              <Label htmlFor="product-price">{t("price")}</Label>
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

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("category")}</Label>
              {settingsLoading ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select
                  value={form.categoryId}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      categoryId: value,
                      productSizeId: "",
                    }))
                  }
                  disabled={categories.length === 0}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectCategory")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.label ?? category.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {!settingsLoading && categories.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  {t("noCategoriesConfigured")}
                </p>
              ) : null}
            </div>

            {requiresProductSize ? (
              <div className="space-y-2">
                <Label>{t("portion")}</Label>
                <Select
                  value={form.productSizeId}
                  onValueChange={(value) =>
                    setForm((current) => ({
                      ...current,
                      productSizeId: value,
                    }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectPortion")} />
                  </SelectTrigger>
                  <SelectContent>
                    {categorySizes.map((size) => (
                      <SelectItem key={size.id} value={size.id}>
                        {size.label ?? size.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">{t("portionHelp")}</p>
              </div>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label>{t("type")}</Label>
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
                <SelectValue placeholder={t("selectType")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SIMPLE">{tType("SIMPLE")}</SelectItem>
                <SelectItem value="COMPOSED">{tType("COMPOSED")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>{t("size")}</Label>
            {sizesLoading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={form.sizeId}
                onValueChange={(value) =>
                  setForm((current) => ({
                    ...current,
                    sizeId: value,
                  }))
                }
                disabled={sizes.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("selectSize")} />
                </SelectTrigger>
                <SelectContent>
                  {sizes.map((size) => (
                    <SelectItem key={size._id} value={size._id}>
                      {size.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
            {!sizesLoading && sizes.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                {t("noProductSizesConfigured")}
              </p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="product-allows-half"
              checked={form.allowsHalf}
              onCheckedChange={(checked) =>
                setForm((current) => ({
                  ...current,
                  allowsHalf: Boolean(checked),
                }))
              }
            />
            <Label htmlFor="product-allows-half">{t("allowHalfAndHalf")}</Label>
          </div>

          {form.type === "COMPOSED" ? (
            <div className="space-y-4 rounded-lg border p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{t("ingredients")}</p>
                  <p className="text-xs text-muted-foreground">
                    {t("ingredientsHelp")}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {t("selected", { count: form.ingredients.length })}
                </span>
              </div>

              <div className="space-y-2">
                <Label>{t("addIngredient")}</Label>
                <IngredientSearchSelect
                  value={selectValue}
                  onValueChange={(value) => {
                    setSelectValue(value);
                    handleIngredientSelect(value);
                  }}
                  searchValue={ingredientSearch}
                  onSearchChange={setIngredientSearch}
                  items={filteredIngredients}
                />
              </div>

              <div className="space-y-3">
                {form.ingredients.length === 0 ? (
                  <div className="rounded-md border border-dashed px-4 py-3 text-xs text-muted-foreground">
                    {t("noIngredientsAdded")}
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
                          <Label className="text-xs">{t("quantity")}</Label>
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

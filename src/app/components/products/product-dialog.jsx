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
import { useFeature } from "@/components/feature-gate";
import { ProductImageField } from "@/components/products/product-image-field";
import { compressImage } from "@/lib/images/compressImage";
import { useProductsStore } from "../../../store/productsStore";
import { useSettingsStore } from "../../../store/settingsStore";

const emptyForm = {
  name: "",
  price: "",
  description: "",
  type: "SIMPLE",
  ingredients: [],
  categoryId: "",
  allowsHalf: false,
  productSizeId: "",
  requiresKitchen: "INHERIT",
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
  const hasIngredients = useFeature("ingredients");
  const {
    ingredients,
    fetchIngredients,
    actionLoading,
    createProduct,
    updateProduct,
    uploadProductImage,
    deleteProductImage,
  } = useProductsStore((state) => ({
    ingredients: state.ingredients,
    fetchIngredients: state.fetchIngredients,
    actionLoading: state.actionLoading,
    createProduct: state.createProduct,
    updateProduct: state.updateProduct,
    uploadProductImage: state.uploadProductImage,
    deleteProductImage: state.deleteProductImage,
  }));

  const { categories, productSizes, settingsLoading, fetchSettings } = useSettingsStore(
    (state) => ({
      categories: state.categories,
      productSizes: state.sizes,
      settingsLoading: state.loading,
      fetchSettings: state.fetchSettings,
    })
  );

  const [form, setForm] = useState(emptyForm);
  const [alert, setAlert] = useState(null);
  const [selectValue, setSelectValue] = useState("");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [imageFile, setImageFile] = useState(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  // El guardado encadena create/update con la subida o borrado de la foto.
  // `actionLoading` del store se apaga entre esas dos llamadas, así que el
  // botón usa esta bandera propia para seguir deshabilitado durante toda la
  // secuencia y evitar un doble envío.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isEditing = Boolean(product?._id);
  const isDuplicating = !isEditing && Boolean(duplicateFrom);

  useEffect(() => {
    if (open) {
      fetchIngredients();
      fetchSettings();
    }
  }, [open, fetchIngredients, fetchSettings]);

  useEffect(() => {
    if (!open) {
      setForm(emptyForm);
      setAlert(null);
      setSelectValue("");
      setIngredientSearch("");
      setImageFile(null);
      setRemoveExistingImage(false);
      return;
    }

    const source = product ?? duplicateFrom;

    if (source) {
      setForm({
        name: source?.name ?? "",
        price: source?.price ?? "",
        description: source?.description ?? "",
        type: source?.type ?? "SIMPLE",
        ingredients: normalizeIngredients(source?.ingredients ?? []),
        categoryId: source?.categoryId ?? "",
        allowsHalf: Boolean(source?.allowsHalf),
        productSizeId: source?.productSizeId ?? "",
        requiresKitchen: source?.requiresKitchen ?? "INHERIT",
      });
    } else {
      setForm(emptyForm);
    }
  }, [open, product, duplicateFrom]);

  useEffect(() => {
    if (!open || isEditing || isDuplicating || form.categoryId) {
      return;
    }
    const defaultCategory = categories.find((category) => category?.id === "bebidas");
    if (defaultCategory?.id) {
      setForm((current) => ({ ...current, categoryId: defaultCategory.id }));
    }
  }, [categories, form.categoryId, isEditing, isDuplicating, open]);

  const selectedCategory = useMemo(
    () => categories.find((category) => category?.id === form.categoryId),
    [categories, form.categoryId]
  );

  const requiresProductSize = Boolean(selectedCategory?.hasSizes);

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
      allowsHalf: Boolean(form.allowsHalf),
      productSizeId: requiresProductSize ? form.productSizeId || null : null,
      requiresKitchen: form.requiresKitchen || "INHERIT",
    };

    if (form.type === "COMPOSED" && hasIngredients) {
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

    payload.description = form.description.trim();

    // Bandera propia para toda la secuencia de guardado: `actionLoading` del
    // store se apaga entre el create/update y la subida/borrado de la foto,
    // y dejar el botón habilitado en ese hueco permite un doble envío.
    setIsSubmitting(true);
    try {
      const result = isEditing
        ? await updateProduct(product._id, payload)
        : await createProduct(payload);

      if (!result?.success) {
        setAlert({
          type: "error",
          message: result?.message || t("saveError"),
        });
        return;
      }

      // El producto ya está guardado. Si falla la imagen no se reporta como
      // error de guardado, porque no lo es: se avisa aparte y el diálogo
      // queda abierto para poder reintentar.
      const productId = isEditing ? product._id : result.product?._id;
      let imageError = null;
      let imageErrorStatus = null;

      if (productId && imageFile) {
        const compressed = await compressImage(imageFile);
        const upload = await uploadProductImage(productId, compressed);
        if (!upload.success) {
          imageError = upload.message;
          imageErrorStatus = upload.status;
        }
      } else if (productId && removeExistingImage && product?.image?.url) {
        const removal = await deleteProductImage(productId);
        if (!removal.success) {
          imageError = removal.message;
          imageErrorStatus = removal.status;
        }
      }

      if (imageError) {
        setImageFile(null);
        // Los mensajes de la API vienen en inglés y no siempre son útiles
        // para el usuario final; se mapean los casos conocidos y se deja el
        // texto original solo para el caso sin mapear, donde ayuda a depurar.
        const message =
          imageErrorStatus === 413
            ? t("photoTooLarge")
            : imageErrorStatus === 400
              ? t("photoUnsupportedFormat")
              : t("photoUploadError", { reason: imageError });
        setAlert({ type: "error", message });
        onSuccess?.();
        return;
      }

      setAlert({ type: "success", message: t("savedSuccessfully") });
      onSuccess?.();
      onOpenChange?.(false);
    } finally {
      setIsSubmitting(false);
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

          <div className="space-y-2">
            <Label htmlFor="product-description">{t("description")}</Label>
            <textarea
              id="product-description"
              rows={3}
              maxLength={300}
              className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder={t("descriptionPlaceholder")}
            />
            <p className="text-right text-xs text-muted-foreground">
              {t("descriptionRemaining", { count: 300 - form.description.length })}
            </p>
          </div>

          <ProductImageField
            currentUrl={removeExistingImage ? null : product?.image?.url ?? null}
            file={imageFile}
            disabled={actionLoading}
            onSelect={(file) => {
              setImageFile(file);
              setRemoveExistingImage(false);
            }}
            onRemove={() => {
              setImageFile(null);
              setRemoveExistingImage(true);
            }}
          />

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
                <Label>{t("size")}</Label>
                {settingsLoading ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Select
                    value={form.productSizeId}
                    onValueChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        productSizeId: value,
                      }))
                    }
                    disabled={productSizes.length === 0}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("selectSize")} />
                    </SelectTrigger>
                    <SelectContent>
                      {productSizes.map((size) => (
                        <SelectItem key={size.id} value={size.id}>
                          {size.label ?? size.id}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {!settingsLoading && productSizes.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    {t("noProductSizesConfigured")}
                  </p>
                ) : null}
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

          <div className="space-y-2">
            <Label>{t("requiresKitchen")}</Label>
            <Select
              value={form.requiresKitchen}
              onValueChange={(value) =>
                setForm((current) => ({
                  ...current,
                  requiresKitchen: value,
                }))
              }
            >
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INHERIT">{t("requiresKitchenInherit")}</SelectItem>
                <SelectItem value="YES">{t("requiresKitchenYes")}</SelectItem>
                <SelectItem value="NO">{t("requiresKitchenNo")}</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">{t("requiresKitchenHelp")}</p>
          </div>

          {/* La receta depende del modulo de inventario. Hoy va incluido en
              todos los planes, pero queda detras del gate para que un producto
              se pueda crear sin mover ingredientes cuando se vuelva opcional. */}
          {form.type === "COMPOSED" && hasIngredients ? (
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
              disabled={isSubmitting}
            >
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
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

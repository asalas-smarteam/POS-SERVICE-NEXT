"use client";

import { Boxes, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AppSpinner } from "@/components/app-spinner";

const formatStock = (value, t) => {
  if (value === 0) {
    return t("stockOut");
  }
  return Number(value || 0).toLocaleString("es-CL");
};

export function IngredientCard({
  ingredient,
  onEdit,
  onDelete,
  deleting,
  getUnitLabel,
}) {
  const t = useTranslations("Ingredients");
  const unitLabel = getUnitLabel
    ? getUnitLabel(ingredient?.unit)
    : ingredient?.unit ?? "-";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="size-4 text-muted-foreground" />
          {ingredient?.name ?? t("unknownIngredient")}
        </CardTitle>
        <CardDescription>{unitLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("stock")}</span>
          <span className="font-medium">{formatStock(ingredient?.stock, t)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("minStock")}</span>
          <span className="font-medium">{formatStock(ingredient?.minStock, t)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => onEdit?.(ingredient)}>
          <Pencil className="mr-2 size-4" />
          {t("editIngredient")}
        </Button>
        <Button
          variant="destructive"
          onClick={() => onDelete?.(ingredient)}
          disabled={deleting}
        >
          {deleting ? (
            <span className="flex items-center gap-2">
              <AppSpinner size={16} inline />
              {t("deleting")}
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Trash2 className="size-4" />
              {t("deleteIngredient")}
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

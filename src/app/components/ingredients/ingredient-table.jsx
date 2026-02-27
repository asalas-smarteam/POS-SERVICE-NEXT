"use client";

import { Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { AppSpinner } from "@/components/app-spinner";

const formatStock = (value, t) => {
  if (value === 0) {
    return t("stockOut");
  }
  return Number(value || 0).toLocaleString("es-CL");
};

export function IngredientTable({
  ingredients,
  onEdit,
  onDelete,
  deletingId,
  getUnitLabel,
}) {
  const t = useTranslations("Ingredients");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("name")}</TableHead>
          <TableHead>{t("unit")}</TableHead>
          <TableHead>{t("stock")}</TableHead>
          <TableHead>{t("minStock")}</TableHead>
          <TableHead className="text-right">{t("actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ingredient) => {
          const unitLabel = getUnitLabel
            ? getUnitLabel(ingredient?.unit)
            : ingredient?.unit ?? "-";
          const isDeleting = deletingId === ingredient._id;
          return (
            <TableRow key={ingredient._id ?? ingredient.name}>
              <TableCell className="font-medium">{ingredient.name}</TableCell>
              <TableCell>{unitLabel}</TableCell>
              <TableCell>{formatStock(ingredient.stock, t)}</TableCell>
              <TableCell>{formatStock(ingredient.minStock, t)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(ingredient)}>
                    <Pencil className="mr-2 size-4" />
                    {t("editIngredient")}
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => onDelete?.(ingredient)}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <span className="flex items-center gap-2">
                        <AppSpinner size={14} inline />
                        {t("deleting")}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Trash2 className="size-4" />
                        {t("deleteIngredient")}
                      </span>
                    )}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

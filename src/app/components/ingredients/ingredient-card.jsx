"use client";

import { Boxes, Pencil, Trash2 } from "lucide-react";
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

const formatStock = (value) => {
  if (value === 0) {
    return "Sin stock";
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
  const unitLabel = getUnitLabel
    ? getUnitLabel(ingredient?.unit)
    : ingredient?.unit ?? "-";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Boxes className="size-4 text-muted-foreground" />
          {ingredient?.name ?? "Ingrediente"}
        </CardTitle>
        <CardDescription>{unitLabel}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Stock</span>
          <span className="font-medium">{formatStock(ingredient?.stock)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Stock mínimo</span>
          <span className="font-medium">{formatStock(ingredient?.minStock)}</span>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={() => onEdit?.(ingredient)}>
          <Pencil className="mr-2 size-4" />
          Editar
        </Button>
        <Button
          variant="destructive"
          onClick={() => onDelete?.(ingredient)}
          disabled={deleting}
        >
          {deleting ? (
            <span className="flex items-center gap-2">
              <AppSpinner size={16} inline />
              Eliminando...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Trash2 className="size-4" />
              Eliminar
            </span>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}

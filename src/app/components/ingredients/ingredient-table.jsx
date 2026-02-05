"use client";

import { Pencil, Trash2 } from "lucide-react";
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

const unitLabelMap = {
  unit: "Unidad",
  g: "gramos",
  kg: "kilos",
};

const formatStock = (value) => {
  if (value === 0) {
    return "Sin stock";
  }
  return Number(value || 0).toLocaleString("es-CL");
};

export function IngredientTable({ ingredients, onEdit, onDelete, deletingId }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Ingrediente</TableHead>
          <TableHead>Unidad</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Stock mínimo</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {ingredients.map((ingredient) => {
          const unitLabel = unitLabelMap[ingredient.unit] ?? ingredient.unit ?? "-";
          const isDeleting = deletingId === ingredient._id;
          return (
            <TableRow key={ingredient._id ?? ingredient.name}>
              <TableCell className="font-medium">{ingredient.name}</TableCell>
              <TableCell>{unitLabel}</TableCell>
              <TableCell>{formatStock(ingredient.stock)}</TableCell>
              <TableCell>{formatStock(ingredient.minStock)}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(ingredient)}>
                    <Pencil className="mr-2 size-4" />
                    Editar
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
                        Eliminando...
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <Trash2 className="size-4" />
                        Eliminar
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

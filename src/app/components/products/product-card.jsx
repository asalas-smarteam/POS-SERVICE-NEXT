"use client";

import { Package, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formatPrice = (price) =>
  Number(price || 0).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });

export function ProductCard({ product, onEdit, categoryLabel }) {
  const ingredientsCount = product?.ingredients?.length ?? 0;
  const typeLabel = product?.type === "COMPOSED" ? "Compuesto" : "Simple";

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="size-4 text-muted-foreground" />
          {product?.name ?? "Producto"}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span>{typeLabel}</span>
          {categoryLabel ? <Badge variant="secondary">{categoryLabel}</Badge> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Precio</span>
          <span className="font-medium">{formatPrice(product?.price)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Ingredientes</span>
          <span className="font-medium">
            {ingredientsCount > 0 ? ingredientsCount : "N/A"}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={() => onEdit?.(product)}>
          <Pencil className="mr-2 size-4" />
          Editar
        </Button>
      </CardFooter>
    </Card>
  );
}

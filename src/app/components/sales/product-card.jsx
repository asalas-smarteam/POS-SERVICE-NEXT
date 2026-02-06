"use client";

import { Coffee } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const formatCurrency = (value) =>
  Number(value ?? 0).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });

export function ProductCard({ product, onSelect }) {
  return (
    <Card
      className={cn(
        "group cursor-pointer border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      )}
      onClick={() => onSelect?.(product)}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex h-28 items-center justify-center rounded-xl bg-muted/60">
          <Coffee className="size-10 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {product?.name ?? "Producto"}
          </p>
          <p className="text-sm font-bold text-primary">
            {formatCurrency(product?.price)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

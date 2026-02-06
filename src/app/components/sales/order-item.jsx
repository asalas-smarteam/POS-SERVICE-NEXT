"use client";

import { Minus, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const formatCurrency = (value) =>
  Number(value ?? 0).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });

export function OrderItem({
  item,
  onIncrease,
  onDecrease,
  onRemove,
  className,
}) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-background p-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{item.name}</p>
          <p className="text-xs text-muted-foreground">{item.notes}</p>
        </div>
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(item.price * item.quantity)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDecrease(item.id)}
            aria-label="Disminuir cantidad"
          >
            <Minus className="size-3" />
          </Button>
          <span className="min-w-6 text-center text-xs font-semibold">
            {item.quantity}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onIncrease(item.id)}
            aria-label="Aumentar cantidad"
          >
            <Plus className="size-3" />
          </Button>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={() => onRemove(item.id)}
          aria-label="Eliminar producto"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </div>
  );
}

"use client";

import { Pause, Trash2, Wallet } from "lucide-react";
import { AppAlert } from "@/components/app-alert";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderItem } from "@/components/sales/order-item";
import { cn } from "@/lib/utils";

const formatCurrency = (value) =>
  Number(value ?? 0).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });

export function OrderSidebar({
  items = [],
  subtotal = 0,
  taxRate = 0.08,
  discount = 0,
  onIncrease,
  onDecrease,
  onRemove,
  onUpdateNotes,
  onClear,
  className,
}) {
  const tax = subtotal * taxRate;
  const total = subtotal + tax - discount;

  return (
    <aside
      className={cn(
        "flex w-full flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm lg:w-[380px]",
        className
      )}
    >
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Current Order</h3>
          <p className="text-xs text-muted-foreground">
            #2405 · Mesa 12 · Walk-in Customer
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          #2405
        </span>
      </div>

      <Separator />

      <ScrollArea className="h-[320px] pr-2 lg:h-[420px]">
        <div className="flex flex-col gap-3">
          {items.length ? (
            items.map((item) => (
              <OrderItem
                key={item.id}
                item={item}
                onIncrease={onIncrease}
                onDecrease={onDecrease}
                onRemove={onRemove}
                onUpdateNotes={onUpdateNotes}
              />
            ))
          ) : (
            <AppAlert type="info" message="No items yet." />
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Tax (8%)</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>Discount</span>
          <span className="text-emerald-600">{formatCurrency(discount)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>Total</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Button variant="outline" className="w-full justify-center gap-2">
          <Pause className="size-4" />
          Hold Order
        </Button>
        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={onClear}
          disabled={!items.length}
        >
          <Trash2 className="size-4" />
          Clear
        </Button>
      </div>

      <Button className="w-full justify-center gap-2" size="lg">
        <Wallet className="size-4" />
        Checkout (F2)
      </Button>
    </aside>
  );
}

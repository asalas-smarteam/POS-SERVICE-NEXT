"use client";

import { useMemo, useState } from "react";
import { MessageSquarePlus, Minus, Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { OrderItemNotesDialog } from "@/components/sales/order-item-notes-dialog";
import { getOrderItemDisplayData } from "@/lib/orders/getOrderItemDisplayData";
import { cn } from "@/lib/utils";

const formatCurrency = (value, locale) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CLP",
  }).format(Number(value ?? 0));

export function OrderItem({
  item,
  onIncrease,
  onDecrease,
  onRemove,
  onUpdateNotes,
  className,
}) {
  const t = useTranslations("Orders");
  const locale = useLocale();
  const [notesOpen, setNotesOpen] = useState(false);
  const displayData = useMemo(() => getOrderItemDisplayData(item), [item]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border/60 bg-background p-3 shadow-sm",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-foreground">{displayData.title}</p>
          {displayData.subtitleLines.length ? (
            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
              {displayData.subtitleLines.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">{t("noObservations")}</p>
          )}
        </div>
        <span className="text-sm font-semibold text-foreground">
          {formatCurrency(item.price * item.quantity, locale)}
        </span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 rounded-full border px-2 py-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onDecrease(item.id)}
            aria-label={t("decreaseQuantity")}
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
            aria-label={t("increaseQuantity")}
          >
            <Plus className="size-3" />
          </Button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-primary"
            onClick={() => setNotesOpen(true)}
            aria-label={t("addNotes")}
          >
            <MessageSquarePlus className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-muted-foreground hover:text-destructive"
            onClick={() => onRemove(item.id)}
            aria-label={t("removeProduct")}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </div>
      <OrderItemNotesDialog
        open={notesOpen}
        onOpenChange={setNotesOpen}
        item={item}
        onSave={onUpdateNotes}
      />
    </div>
  );
}

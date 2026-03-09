"use client";

import { Pause, Trash2, Wallet } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { AppAlert } from "@/components/app-alert";
import { AppSpinner } from "@/components/app-spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderItem } from "@/components/sales/order-item";
import { cn } from "@/lib/utils";

const formatCurrency = (value, locale) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CLP",
  }).format(Number(value ?? 0));

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
  onCheckout,
  isSubmitting = false,
  checkoutError,
  className,
}) {
  const t = useTranslations("Orders");
  const locale = useLocale();
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
          <h3 className="text-lg font-semibold">{t("currentOrder")}</h3>
          <p className="text-xs text-muted-foreground">
            #2405 · {t("table")} 12 · {t("walkInCustomer")}
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
            <AppAlert type="info" message={t("noItemsYet")} />
          )}
        </div>
      </ScrollArea>

      <Separator />

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{t("subtotal")}</span>
          <span>{formatCurrency(subtotal, locale)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{`${t("tax")} (8%)`}</span>
          <span>{formatCurrency(tax, locale)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{t("discount")}</span>
          <span className="text-emerald-600">{formatCurrency(discount, locale)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>{t("total")}</span>
          <span className="text-primary">{formatCurrency(total, locale)}</span>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        <Button variant="outline" className="w-full justify-center gap-2">
          <Pause className="size-4" />
          {t("holdOrder")}
        </Button>
        <Button
          variant="outline"
          className="w-full justify-center gap-2"
          onClick={onClear}
          disabled={!items.length}
        >
          <Trash2 className="size-4" />
          {t("clear")}
        </Button>
      </div>

      {checkoutError ? (
        <AppAlert type="error" message={checkoutError} />
      ) : null}

      <Button
        className="w-full justify-center gap-2"
        size="lg"
        onClick={onCheckout}
        disabled={!items.length || isSubmitting}
      >
        <Wallet className="size-4" />
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <AppSpinner size={16} inline />
            {t("processing")}
          </span>
        ) : (
          t("checkoutShortcut")
        )}
      </Button>
    </aside>
  );
}

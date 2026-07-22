"use client";

import { Pause, Save, Trash2, Wallet } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppAlert } from "@/components/app-alert";
import { AppSpinner } from "@/components/app-spinner";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderItem } from "@/components/sales/order-item";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";

export function OrderSidebar({
  items = [],
  orderNumber = "",
  orderContextLabel = "",
  subtotal = 0,
  taxRate = 0.08,
  discount = 0,
  onIncrease,
  onDecrease,
  onRemove,
  onUpdateNotes,
  onClear,
  onCheckout,
  onSave,
  isEditing = false,
  canSave = false,
  isSaving = false,
  isSubmitting = false,
  isLoading = false,
  checkoutError,
  className,
}) {
  const t = useTranslations("Orders");
  const { formatCurrency } = useCurrencyFormatter();
  const tax = subtotal * taxRate;
  const total = subtotal + tax - discount;
  const normalizedOrderNumber = orderNumber?.trim() ? orderNumber.trim() : "";
  const hasOrderNumber = Boolean(normalizedOrderNumber);
  const orderNumberLabel = hasOrderNumber
    ? `#${normalizedOrderNumber}`
    : isLoading
      ? t("loading")
      : t("newOrder");
  const normalizedContextLabel = orderContextLabel?.trim()
    ? orderContextLabel.trim()
    : t("walkInCustomer");

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
            {orderNumberLabel} {normalizedContextLabel}
          </p>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
          {orderNumberLabel}
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
          <span>{formatCurrency(subtotal)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{`${t("tax")} (8%)`}</span>
          <span>{formatCurrency(tax)}</span>
        </div>
        <div className="flex items-center justify-between text-muted-foreground">
          <span>{t("discount")}</span>
          <span className="text-emerald-600">{formatCurrency(discount)}</span>
        </div>
        <Separator />
        <div className="flex items-center justify-between text-base font-semibold">
          <span>{t("total")}</span>
          <span className="text-primary">{formatCurrency(total)}</span>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-2">
        {isEditing ? (
          <Button
            variant="outline"
            className="w-full justify-center gap-2"
            onClick={onSave}
            disabled={!canSave || isSaving || isSubmitting}
          >
            {isSaving ? (
              <span className="flex items-center gap-2">
                <AppSpinner size={16} inline />
                {t("saving")}
              </span>
            ) : (
              <>
                <Save className="size-4" />
                {t("saveOrder")}
              </>
            )}
          </Button>
        ) : (
          <Button variant="outline" className="w-full justify-center gap-2">
            <Pause className="size-4" />
            {t("holdOrder")}
          </Button>
        )}
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
        disabled={!items.length || isSubmitting || isSaving}
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

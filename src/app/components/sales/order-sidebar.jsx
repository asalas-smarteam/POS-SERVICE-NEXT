"use client";

import { useState } from "react";
import { Check, Pause, Plus, Save, Split, Trash2, Users, Wallet, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { AppAlert } from "@/components/app-alert";
import { AppSpinner } from "@/components/app-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { OrderItem } from "@/components/sales/order-item";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { calculateOrderTotals, DEFAULT_TAX_RATE } from "@/lib/pricing/orderTotals";
import { cn } from "@/lib/utils";

const SHARED = "shared";

export function OrderSidebar({
  items = [],
  orderNumber = "",
  orderContextLabel = "",
  subtotal = 0,
  taxRate = DEFAULT_TAX_RATE,
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
  // En movil el panel vive dentro de un drawer: ocupa todo el alto disponible y
  // necesita su propio boton de cierre.
  fullHeight = false,
  onClose,
  // Split bill
  splitEnabled = false,
  subAccounts = [],
  activeAccountId = SHARED,
  onToggleSplit,
  onAddAccount,
  onSelectAccount,
  onRemoveAccount,
}) {
  const t = useTranslations("Orders");
  const { formatCurrency } = useCurrencyFormatter();
  const { tax, total } = calculateOrderTotals({ subtotal, taxRate, discount });

  const [addingPerson, setAddingPerson] = useState(false);
  const [personName, setPersonName] = useState("");

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

  const accountOf = (item) =>
    item.accountId && String(item.accountId) !== SHARED ? String(item.accountId) : SHARED;

  const subtotalOfAccount = (accountId) =>
    items
      .filter((it) => accountOf(it) === accountId)
      .reduce((s, it) => s + Number(it.price || 0) * Number(it.quantity || 1), 0);

  const visibleItems = splitEnabled
    ? items.filter((it) => accountOf(it) === String(activeAccountId))
    : items;

  const confirmAddPerson = () => {
    const name = personName.trim();
    onAddAccount?.(name);
    setPersonName("");
    setAddingPerson(false);
  };

  const tabs = [
    { id: SHARED, name: t("shared") },
    ...subAccounts.map((a) => ({ id: a.id, name: a.name || t("addPerson") })),
  ];

  return (
    <aside
      className={cn(
        "flex w-full flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm lg:w-[380px]",
        fullHeight && "h-full min-h-0 rounded-none border-0 shadow-none lg:w-full",
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onToggleSplit?.(!splitEnabled)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold transition active:scale-95",
              splitEnabled
                ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                : "border-muted text-muted-foreground hover:border-blue-400"
            )}
          >
            <Split className="size-3.5" />
            {t("splitBill")}
          </button>
          {onClose ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={t("close")}
              onClick={onClose}
            >
              <X className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {splitEnabled ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const isActive = String(activeAccountId) === String(tab.id);
            const isShared = tab.id === SHARED;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onSelectAccount?.(tab.id)}
                className={cn(
                  "group flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-medium transition",
                  isActive
                    ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                    : "border-slate-200 text-muted-foreground hover:border-blue-400 dark:border-slate-700"
                )}
              >
                {isShared ? <Users className="size-3.5" /> : null}
                {tab.name}
                <span className="text-[10px] opacity-70">
                  {formatCurrency(subtotalOfAccount(tab.id))}
                </span>
                {!isShared ? (
                  <X
                    className="size-3 opacity-50 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveAccount?.(tab.id);
                    }}
                  />
                ) : null}
              </button>
            );
          })}

          {addingPerson ? (
            <span className="flex items-center gap-1">
              <Input
                autoFocus
                value={personName}
                onChange={(e) => setPersonName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") confirmAddPerson();
                  if (e.key === "Escape") {
                    setAddingPerson(false);
                    setPersonName("");
                  }
                }}
                placeholder={t("personName")}
                className="h-7 w-28 text-xs"
              />
              <Button type="button" size="icon" className="size-7" onClick={confirmAddPerson}>
                <Check className="size-3.5" />
              </Button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setAddingPerson(true)}
              className="flex items-center gap-1 rounded-lg border border-dashed border-slate-300 px-2.5 py-1 text-xs font-medium text-muted-foreground hover:border-blue-400 dark:border-slate-600"
            >
              <Plus className="size-3.5" />
              {t("addPerson")}
            </button>
          )}
        </div>
      ) : null}

      <Separator />

      <ScrollArea
        className={cn(
          "pr-2",
          fullHeight ? "min-h-0 flex-1" : "h-[300px] lg:h-[400px]"
        )}
      >
        <div className="flex flex-col gap-3">
          {visibleItems.length ? (
            visibleItems.map((item) => (
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
        {splitEnabled ? (
          <div className="flex items-center justify-between font-medium text-blue-600 dark:text-blue-400">
            <span>{tabs.find((tb) => String(tb.id) === String(activeAccountId))?.name}</span>
            <span>{formatCurrency(subtotalOfAccount(String(activeAccountId)))}</span>
          </div>
        ) : null}
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

      {checkoutError ? <AppAlert type="error" message={checkoutError} /> : null}

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

"use client";

import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";

/**
 * Recibo de pago con el mismo lenguaje visual que el ticket de cocina
 * (KitchenTicketContent). Se renderiza como HTML para que el simbolo de
 * moneda (por ej. ₡) salga bien y para imprimir/exportar con el mismo diseno.
 */
export function PaymentReceiptContent({
  tenantName = "POS",
  orderNumber,
  dateValue,
  methodValue = "",
  lines = [],
  modeLabel = "",
  amount = 0,
  total = 0,
  amountPaid = 0,
  amountDue = 0,
  className,
}) {
  const t = useTranslations("Orders");
  const { formatCurrency } = useCurrencyFormatter();

  return (
    <div
      className={cn(
        "mx-auto w-[300px] rounded-md border bg-background p-4 text-xs text-foreground shadow-sm",
        className
      )}
    >
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold uppercase">{tenantName}</p>
        <p className="text-[11px] font-semibold uppercase text-muted-foreground">
          {t("receiptTitle")}
        </p>
      </div>

      <Separator className="my-3" />

      <div className="space-y-0.5 text-[11px]">
        <div className="flex justify-between">
          <span className="font-semibold">{t("orderLabel")}</span>
          <span className="text-muted-foreground">#{orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">{t("dateAndTime")}</span>
          <span className="text-muted-foreground">{dateValue}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-semibold">{t("method")}</span>
          <span className="text-muted-foreground">{methodValue}</span>
        </div>
      </div>

      <Separator className="my-3" />

      <div className="space-y-1 rounded-md border border-border/60 bg-muted/20 p-2 text-[11px]">
        {lines.length ? (
          lines.map((line, index) => (
            <div key={`${line.name}-${index}`} className="flex justify-between gap-2">
              <span className="min-w-0 flex-1 truncate">
                {Number(line.quantity) > 1 ? `${line.quantity}× ` : ""}
                {line.name}
              </span>
              <span className="shrink-0 font-medium">
                {formatCurrency(line.totalPrice)}
              </span>
            </div>
          ))
        ) : (
          <p className="text-muted-foreground">{modeLabel}</p>
        )}
      </div>

      <Separator className="my-3" />

      <div className="flex items-center justify-between text-sm font-bold">
        <span>{t("paidThis")}</span>
        <span>{formatCurrency(amount)}</span>
      </div>

      <div className="mt-2 space-y-0.5 text-[11px] text-muted-foreground">
        <div className="flex justify-between">
          <span>{t("total")}</span>
          <span>{formatCurrency(total)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("paidLabel")}</span>
          <span>{formatCurrency(amountPaid)}</span>
        </div>
        <div className="flex justify-between">
          <span>{t("amountDue")}</span>
          <span>{formatCurrency(amountDue)}</span>
        </div>
      </div>

      <Separator className="my-3" />

      <p className="text-center text-[11px] font-semibold text-muted-foreground">
        {t("receiptFooter")}
      </p>
    </div>
  );
}

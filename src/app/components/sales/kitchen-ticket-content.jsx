"use client";

import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import { getOrderItemDisplayData } from "@/lib/orders/getOrderItemDisplayData";
import { splitItemsByKitchen } from "@/lib/tenant/kitchenRouting";
import { useFeature } from "@/components/feature-gate";
import { cn } from "@/lib/utils";

export function KitchenTicketContent({
  orderNumber,
  serviceTypeValue = "",
  datetimeValue,
  customerName = "",
  items = [],
  orderNotes = [],
  includeItemNote = true,
  className,
}) {
  const t = useTranslations("Kitchen");
  // Este componente imprime el recibo de TODAS las ordenes, no solo las que van
  // a cocina. Sin el modulo contratado se cae a un recibo plano: un solo bloque
  // de items y titulo neutro, sin la division preparacion / sin preparacion.
  const hasKitchen = useFeature("kitchen");
  const labels = {
    half: t("half"),
    ingredients: t("ingredients"),
    extras: t("extras"),
    removed: t("removed"),
    cashierNote: t("cashierNote"),
  };

  // Los productos que no requieren preparacion (bebidas, empacados) van en un
  // bloque aparte al final: cocina ve el contexto completo de la mesa sin
  // confundirlos con lo que tiene que preparar.
  const { kitchenItems, otherItems } = hasKitchen
    ? splitItemsByKitchen(items)
    : { kitchenItems: items, otherItems: [] };

  const renderItem = (item, index) => {
    const { title, subtitleLines } = getOrderItemDisplayData(item, {
      labels,
      includeNote: includeItemNote,
    });
    return (
      <div key={`${item.productName ?? item.name}-${index}`}>
        <p className="text-[11px] font-semibold">
          {item.quantity}x {title}
        </p>
        {subtitleLines.length ? (
          <ul className="mt-1 space-y-1 pl-3 text-[10px] text-muted-foreground">
            {subtitleLines.map((line, idx) => (
              <li key={`${line}-${idx}`}>{line}</li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  };

  return (
    <div className={cn("mx-auto w-[300px] rounded-md border bg-background p-4 text-xs text-foreground shadow-sm", className)}>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold uppercase">
          {hasKitchen ? t("kitchenOrder") : t("orderTicket")}
        </p>
        <p className="text-2xl font-bold">#{orderNumber}</p>
        {serviceTypeValue ? (
          <p className="text-[11px] font-semibold uppercase text-muted-foreground">{serviceTypeValue}</p>
        ) : null}
      </div>

      <Separator className="my-3" />

      <div className="space-y-1">
        <p className="text-[11px] font-semibold">{t("dateAndTime")}</p>
        <p className="text-[11px] text-muted-foreground">{datetimeValue}</p>
      </div>


      {customerName ? (
        <>
          <Separator className="my-3" />
          <div className="space-y-1">
            <p className="text-[11px] font-semibold">{t("customer")}</p>
            <p className="text-[11px] text-muted-foreground">{customerName}</p>
          </div>
        </>
      ) : null}

      <Separator className="my-3" />

      {kitchenItems.length ? (
        <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
          {kitchenItems.map(renderItem)}
        </div>
      ) : null}

      {otherItems.length ? (
        <div
          className={cn(
            "space-y-2 rounded-md border border-dashed border-border/70 p-2",
            kitchenItems.length ? "mt-2" : null
          )}
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t("noPrepItems")}
          </p>
          <div className="space-y-2 text-muted-foreground">
            {otherItems.map(renderItem)}
          </div>
        </div>
      ) : null}

      <Separator className="my-3" />

      <div className="space-y-1 rounded-md border border-dashed border-border/70 bg-muted/30 p-2">
        <p className="text-[11px] font-semibold">{t("notes")}</p>
        {orderNotes.length ? (
          <ul className="space-y-1 text-[10px] text-muted-foreground">
            {orderNotes.map((note, idx) => (
              <li key={`${note}-${idx}`}>- {note}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-muted-foreground">{t("noNotes")}</p>
        )}
      </div>
    </div>
  );
}

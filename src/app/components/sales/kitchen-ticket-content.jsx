"use client";

import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import { getOrderItemDisplayData } from "@/lib/orders/getOrderItemDisplayData";
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
  const labels = {
    half: t("half"),
    ingredients: t("ingredients"),
    extras: t("extras"),
    removed: t("removed"),
    cashierNote: t("cashierNote"),
  };

  return (
    <div className={cn("mx-auto w-[300px] rounded-md border bg-background p-4 text-xs text-foreground shadow-sm", className)}>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold uppercase">{t("kitchenOrder")}</p>
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

      <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
        {items.map((item, index) => {
          const { title, subtitleLines } = getOrderItemDisplayData(item, {
            labels,
            includeNote: includeItemNote,
          });
          return (
          <div key={`${item.name}-${index}`}>
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
        })}
      </div>

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

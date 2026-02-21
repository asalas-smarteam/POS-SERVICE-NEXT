"use client";

import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

export function KitchenTicketContent({
  orderNumber,
  datetimeValue,
  items = [],
  orderNotes = [],
  className,
}) {
  return (
    <div className={cn("mx-auto w-[300px] rounded-md border bg-background p-4 text-xs text-foreground shadow-sm", className)}>
      <div className="space-y-1 text-center">
        <p className="text-sm font-semibold uppercase">Orden de cocina</p>
        <p className="text-2xl font-bold">#{orderNumber}</p>
      </div>

      <Separator className="my-3" />

      <div className="space-y-1">
        <p className="text-[11px] font-semibold">Fecha y hora</p>
        <p className="text-[11px] text-muted-foreground">{datetimeValue}</p>
      </div>

      <Separator className="my-3" />

      <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-2">
        {items.map((item, index) => (
          <div key={`${item.name}-${index}`}>
            <p className="text-[11px] font-semibold">
              {item.quantity}x {item.name}
            </p>
            {item.notes?.length ? (
              <ul className="mt-1 space-y-1 text-[10px] text-muted-foreground">
                {item.notes.map((note, idx) => (
                  <li key={`${note}-${idx}`}>- {note}</li>
                ))}
              </ul>
            ) : null}
          </div>
        ))}
      </div>

      <Separator className="my-3" />

      <div className="space-y-1 rounded-md border border-dashed border-border/70 bg-muted/30 p-2">
        <p className="text-[11px] font-semibold">Notas</p>
        {orderNotes.length ? (
          <ul className="space-y-1 text-[10px] text-muted-foreground">
            {orderNotes.map((note, idx) => (
              <li key={`${note}-${idx}`}>- {note}</li>
            ))}
          </ul>
        ) : (
          <p className="text-[10px] text-muted-foreground">Sin notas</p>
        )}
      </div>
    </div>
  );
}

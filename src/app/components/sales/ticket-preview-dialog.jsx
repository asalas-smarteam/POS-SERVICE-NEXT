"use client";

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";

export function TicketPreviewDialog({
  open,
  onOpenChange,
  ticket,
  onPrint,
}) {
  if (!ticket) {
    return null;
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Previsualización de ticket</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <ScrollArea className="h-[520px] w-full rounded-lg border bg-muted/30 p-6">
            <div className="mx-auto w-[300px] rounded-md border bg-background p-4 text-xs text-foreground shadow-sm">
              <div className="space-y-1 text-center">
                <p className="text-sm font-semibold uppercase">Orden de cocina</p>
                <p className="text-2xl font-bold">#{ticket.orderNumber}</p>
              </div>

              <Separator className="my-3" />

              <div className="space-y-1">
                <p className="text-[11px] font-semibold">Mesa / Cliente</p>
                <p className="text-[11px] text-muted-foreground">
                  {ticket.tableValue}
                </p>
                <p className="mt-2 text-[11px] font-semibold">Fecha y hora</p>
                <p className="text-[11px] text-muted-foreground">
                  {ticket.datetimeValue}
                </p>
              </div>

              <Separator className="my-3" />

              <div className="space-y-3">
                {ticket.items.map((item) => (
                  <div key={`${item.name}-${item.quantity}`}>
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

              {ticket.orderNotes?.length ? (
                <>
                  <Separator className="my-3" />
                  <div className="space-y-1">
                    <p className="text-[11px] font-semibold">Notas</p>
                    <ul className="space-y-1 text-[10px] text-muted-foreground">
                      {ticket.orderNotes.map((note, idx) => (
                        <li key={`${note}-${idx}`}>- {note}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : null}

              <Separator className="my-3" />

              <div className="space-y-1 text-center">
                <p className="text-[11px] text-muted-foreground">
                  Terminal: {ticket.terminalValue}
                </p>
                <p className="text-[11px] font-semibold">
                  *** FIN DEL TICKET ***
                </p>
              </div>
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" type="button" onClick={() => onOpenChange?.(false)}>
            Cerrar
          </Button>
          <Button type="button" onClick={onPrint}>
            Imprimir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

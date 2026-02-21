"use client";

import { useRef } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { loadJsPdf } from "@/lib/pdf/ticketJsPdf";

export function TicketPreviewDialog({
  open,
  onOpenChange,
  ticket,
  onPrint,
}) {
  const ticketRef = useRef(null);

  if (!ticket) {
    return null;
  }

  const generatePDF = async () => {
    if (!ticketRef.current) {
      return;
    }

    const jsPDF = await loadJsPdf();
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 200],
    });

    await doc.html(ticketRef.current, {
      callback: (pdfDoc) => {
        pdfDoc.save(`ticket-${ticket.orderNumber}.pdf`);
      },
      margin: [0, 0, 0, 0],
      autoPaging: "text",
    });
  };

  const handlePrint = () => {
    if (onPrint) {
      onPrint(ticketRef.current);
      return;
    }

    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="no-print">
          <DialogTitle>Previsualización de ticket</DialogTitle>
        </DialogHeader>

        {/*
          Web vs Print/PDF separation:
          - La UI web mantiene el Dialog completo.
          - El contenido imprimible/PDF vive en un único nodo (ticketRef).
        */}
        <div ref={ticketRef} className="ticket-print-root flex flex-col items-center gap-4">
          <ScrollArea className="ticket-scroll-area h-[520px] w-full rounded-lg border bg-muted/30 p-6">
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

        <DialogFooter className="no-print gap-2 sm:gap-0">
          <Button className="no-print" variant="outline" type="button" onClick={() => onOpenChange?.(false)}>
            Cerrar
          </Button>
          <Button className="no-print" variant="secondary" type="button" onClick={generatePDF}>
            Descargar PDF
          </Button>
          <Button className="no-print" type="button" onClick={handlePrint}>
            Imprimir
          </Button>
        </DialogFooter>

        <style jsx global>{`
          @media print {
            .no-print {
              display: none !important;
            }

            body * {
              visibility: hidden;
            }

            .ticket-print-root,
            .ticket-print-root * {
              visibility: visible;
            }

            .ticket-print-root {
              position: absolute;
              inset: 0 auto auto 0;
              width: 80mm;
              margin: 0;
              padding: 0;
            }

            .ticket-scroll-area {
              height: auto !important;
              overflow: visible !important;
              border: none !important;
              padding: 0 !important;
              background: transparent !important;
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
}

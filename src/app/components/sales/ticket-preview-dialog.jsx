"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KitchenTicketContent } from "@/components/sales/kitchen-ticket-content";
import { loadJsPdf } from "@/lib/pdf/ticketJsPdf";

export function TicketPreviewDialog({
  open,
  onOpenChange,
  ticket,
  onPrint,
}) {
  const t = useTranslations("Orders");
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
          <DialogTitle>{t("ticketPreview")}</DialogTitle>
        </DialogHeader>

        <div ref={ticketRef} className="ticket-print-root flex flex-col items-center gap-4">
          <ScrollArea className="ticket-scroll-area h-[520px] w-full rounded-lg border bg-muted/30 p-6">
            <KitchenTicketContent
              orderNumber={ticket.orderNumber}
              serviceTypeValue={ticket.serviceTypeValue}
              datetimeValue={ticket.datetimeValue}
              customerName={ticket.customerName}
              items={ticket.items}
              orderNotes={ticket.orderNotes}
            />
          </ScrollArea>
        </div>

        <DialogFooter className="no-print gap-2 sm:gap-0">
          <Button className="no-print" variant="outline" type="button" onClick={() => onOpenChange?.(false)}>
            {t("close")}
          </Button>
          <Button className="no-print" variant="secondary" type="button" onClick={generatePDF}>
            {t("downloadPdf")}
          </Button>
          <Button className="no-print" type="button" onClick={handlePrint}>
            {t("print")}
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

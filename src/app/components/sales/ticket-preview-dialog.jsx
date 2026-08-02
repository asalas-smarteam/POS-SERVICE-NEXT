"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { KitchenTicketContent } from "@/components/sales/kitchen-ticket-content";
import { loadJsPdf } from "@/lib/pdf/ticketJsPdf";
import { printThermalNode } from "@/lib/pdf/printThermal";

export function TicketPreviewDialog({
  open,
  onOpenChange,
  ticket,
}) {
  const t = useTranslations("Orders");
  const printRef = useRef(null);

  if (!ticket) {
    return null;
  }

  const generatePDF = async () => {
    if (!printRef.current) {
      return;
    }

    const jsPDF = await loadJsPdf();
    const doc = new jsPDF({
      unit: "mm",
      format: [80, 200],
    });

    await doc.html(printRef.current, {
      callback: (pdfDoc) => {
        pdfDoc.save(`ticket-${ticket.orderNumber}.pdf`);
      },
      margin: [0, 0, 0, 0],
      autoPaging: "text",
      width: 76,
      windowWidth: 300,
    });
  };

  const handlePrint = () => {
    printThermalNode(printRef.current);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader className="no-print">
          <DialogTitle>{t("ticketPreview")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <ScrollArea className="h-[520px] w-full rounded-lg border bg-muted/30 p-6">
            <div ref={printRef}>
              <KitchenTicketContent
                orderNumber={ticket.orderNumber}
                serviceTypeValue={ticket.serviceTypeValue}
                datetimeValue={ticket.datetimeValue}
                customerName={ticket.customerName}
                items={ticket.items}
                orderNotes={ticket.orderNotes}
                includeItemNote={false}
              />
            </div>
          </ScrollArea>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" type="button" onClick={() => onOpenChange?.(false)}>
            {t("close")}
          </Button>
          <Button variant="secondary" type="button" onClick={generatePDF}>
            {t("downloadPdf")}
          </Button>
          <Button type="button" onClick={handlePrint}>
            {t("print")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

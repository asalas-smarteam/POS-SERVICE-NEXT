"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PaymentReceiptContent } from "@/components/sales/payment-receipt-content";
import { loadJsPdf } from "@/lib/pdf/ticketJsPdf";
import { printThermalNode } from "@/lib/pdf/printThermal";

export function PaymentReceiptDialog({ open, onOpenChange, receipt }) {
  const t = useTranslations("Orders");
  const printRef = useRef(null);

  if (!receipt) {
    return null;
  }

  const generatePDF = async () => {
    if (!printRef.current) {
      return;
    }

    const jsPDF = await loadJsPdf();
    const doc = new jsPDF({ unit: "mm", format: [80, 200] });

    await doc.html(printRef.current, {
      callback: (pdfDoc) => {
        pdfDoc.save(`recibo-${receipt.orderNumber}.pdf`);
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
        <DialogHeader>
          <DialogTitle>{t("receiptTitle")}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4">
          <ScrollArea className="h-[45vh] w-full rounded-lg border bg-muted/30 p-4 sm:h-[520px] sm:p-6">
            <div ref={printRef}>
              <PaymentReceiptContent
                tenantName={receipt.tenantName}
                orderNumber={receipt.orderNumber}
                dateValue={receipt.dateValue}
                methodValue={receipt.methodValue}
                lines={receipt.lines}
                modeLabel={receipt.modeLabel}
                amount={receipt.amount}
                total={receipt.total}
                amountPaid={receipt.amountPaid}
                amountDue={receipt.amountDue}
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

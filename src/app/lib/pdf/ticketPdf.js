import PDFDocument from "pdfkit";
import { getKitchenItemDisplayData } from "@/lib/orders/getKitchenItemDisplayData";

export function generateTicketPDF(order, tenantName) {
  const doc = new PDFDocument({ size: "A7", margin: 10 });

  doc.fontSize(10).text(tenantName, { align: "center" });
  doc.moveDown(0.5);
  doc.text(`Order: ${order._id}`);
  doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`);
  if (order.customerName) {
    doc.text(`Customer: ${order.customerName}`);
  }
  doc.moveDown(0.5);

  doc.text("----------------------");

  order.items.forEach((item, idx) => {
    const display = getKitchenItemDisplayData(item);

    doc.text(`${idx + 1}. ${display.title}`);
    doc.text(`Qty: ${item.quantity}`);

    if (display.ingredients.length) {
      doc.text(`Ingredients: ${display.ingredients.join(", ")}`);
    }
    if (display.extras.length) {
      doc.text(`Extras: ${display.extras.join(", ")}`);
    }
    if (display.removed.length) {
      doc.text(`Removed: ${display.removed.join(", ")}`);
    }
    if (display.notes) {
      doc.text(`Cashier Note: ${display.notes}`);
    }

    doc.moveDown(0.3);
  });

  doc.text("----------------------");
  doc.text(`TOTAL: ₡${order.total}`, { align: "right" });

  // Resumen de pagos (split bill), si los hay.
  const payments = Array.isArray(order.payments) ? order.payments : [];
  if (payments.length) {
    doc.moveDown(0.3);
    doc.text("Pagos:");
    payments.forEach((p, i) => {
      doc.text(`  ${i + 1}. ₡${Number(p.amount || 0)} (${p.method || ""})`, {
        align: "right",
      });
    });
  }

  doc.end();
  return doc;
}

const METHOD_LABELS = { cash: "Efectivo", card: "Tarjeta", other: "Otro" };

// Recibo de UN pago (parcial o total): lo pagado + saldo restante de la orden.
export function generatePaymentReceiptPDF(order, payment, tenantName) {
  const doc = new PDFDocument({ size: "A7", margin: 10 });

  const total = Number(order.total || 0);
  const amountPaid = Number(order.amountPaid || 0);
  const remaining = Math.max(0, total - amountPaid);

  doc.fontSize(10).text(tenantName, { align: "center" });
  doc.moveDown(0.3);
  doc.fontSize(9).text("RECIBO DE PAGO", { align: "center" });
  doc.moveDown(0.4);

  doc.fontSize(8);
  doc.text(`Orden: ${order._id}`);
  doc.text(`Fecha: ${new Date(payment.paidAt || Date.now()).toLocaleString()}`);
  doc.text(`Metodo: ${METHOD_LABELS[payment.method] || payment.method || ""}`);
  doc.moveDown(0.3);
  doc.text("----------------------");

  const lines = Array.isArray(payment.lines) ? payment.lines : [];
  if (lines.length) {
    lines.forEach((l) => {
      // La cantidad importa cuando el pago cubrio solo parte de una linea
      // (p.ej. 2 de 10 Coca Colas).
      const qtyPrefix = Number(l.quantity) > 1 ? `${Number(l.quantity)}x ` : "";
      doc.text(`${qtyPrefix}${l.name}  ₡${Number(l.totalPrice || 0)}`);
    });
  } else {
    const label =
      payment.mode === "equal"
        ? "Parte igualitaria"
        : payment.mode === "full"
          ? "Pago total"
          : "Pago";
    doc.text(label);
  }

  doc.moveDown(0.3);
  doc.text("----------------------");
  doc.fontSize(9).text(`PAGADO: ₡${Number(payment.amount || 0)}`, { align: "right" });
  doc.fontSize(8);
  doc.text(`Total orden: ₡${total}`, { align: "right" });
  doc.text(`Abonado: ₡${amountPaid}`, { align: "right" });
  doc.text(`Restante: ₡${remaining}`, { align: "right" });

  doc.end();
  return doc;
}

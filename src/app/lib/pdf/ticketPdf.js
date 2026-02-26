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

  doc.end();
  return doc;
}

import PDFDocument from "pdfkit";

export function generateTicketPDF(order, tenantName) {
  const doc = new PDFDocument({ size: "A7", margin: 10 });

  doc.fontSize(10).text(tenantName, { align: "center" });
  doc.moveDown(0.5);
  doc.text(`Orden: ${order._id}`);
  doc.text(`Fecha: ${new Date(order.createdAt).toLocaleString()}`);
  doc.moveDown(0.5);

  doc.text("----------------------");

  order.items.forEach((item, idx) => {
    doc.text(`${idx + 1}. Producto`);
    doc.text(`Cantidad: ${item.quantity}`);
    if (item.note) doc.text(`Nota: ${item.note}`);
    doc.moveDown(0.3);
  });

  doc.text("----------------------");
  doc.text(`TOTAL: ₡${order.total}`, { align: "right" });

  doc.end();
  return doc;
}

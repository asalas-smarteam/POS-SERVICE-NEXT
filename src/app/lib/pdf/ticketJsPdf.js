import { getOrderItemDisplayData } from "@/lib/orders/getOrderItemDisplayData";
import { splitItemsByKitchen } from "@/lib/tenant/kitchenRouting";

const JSPDF_CDN =
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";

export const loadJsPdf = () =>
  new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("jsPDF solo está disponible en el navegador."));
      return;
    }

    if (window.jspdf?.jsPDF) {
      resolve(window.jspdf.jsPDF);
      return;
    }

    const script = document.createElement("script");
    script.src = JSPDF_CDN;
    script.async = true;
    script.onload = () => {
      if (window.jspdf?.jsPDF) {
        resolve(window.jspdf.jsPDF);
      } else {
        reject(new Error("No se pudo cargar jsPDF."));
      }
    };
    script.onerror = () =>
      reject(new Error("No se pudo cargar jsPDF desde CDN."));
    document.body.appendChild(script);
  });

/**
 * Genera un ticket térmico (80mm) usando jsPDF.
 */
export async function generateKitchenTicketPdf(ticket) {
  const jsPDF = await loadJsPdf();

  const labels = ticket.labels ?? {};
  const lineHeight = 4.5;
  const baseLines = 16;
  const itemLines = (ticket.items || []).reduce((count, item) => {
    const { subtitleLines } = getOrderItemDisplayData(item, {
      labels,
      includeNote: false,
    });
    return count + 1 + subtitleLines.length;
  }, 0);
  // Igual que en la previsualizacion: lo que cocina prepara arriba, el resto
  // (bebidas, empacados) en un bloque etiquetado al final.
  const { kitchenItems, otherItems } = splitItemsByKitchen(ticket.items);
  // +2 lineas por el encabezado y la separacion del bloque "sin preparacion".
  const extraLines = otherItems.length ? 2 : 0;
  const height = Math.max(80, (baseLines + itemLines + extraLines) * lineHeight);

  const doc = new jsPDF({
    unit: "mm",
    format: [80, height],
  });

  let y = 6;
  const center = 40;

  doc.setFontSize(12);
  doc.text(labels.kitchenOrder || "KITCHEN ORDER", center, y, { align: "center" });

  y += 7;
  doc.setFontSize(16);
  doc.text(`#${ticket.orderNumber}`, center, y, { align: "center" });

  y += 5;
  if (ticket.serviceTypeValue) {
    doc.setFontSize(10);
    doc.text(`${ticket.serviceTypeValue}`, center, y + 5, { align: "center" });
    y += 7;
  }

  y += 4;
  doc.setFontSize(9);
  doc.text(ticket.datetimeLabel || "Fecha y hora", 6, y);
  doc.text(ticket.datetimeValue || "-", 6, y + 4);

  y += 9;
  if (ticket.customerName) {
    doc.text(labels.customer || "Customer", 6, y);
    doc.text(ticket.customerName, 6, y + 4);
    y += 9;
  }
  doc.line(4, y, 76, y);

  y += 4;
  doc.setFontSize(10);

  const printItem = (item) => {
    const { title, subtitleLines } = getOrderItemDisplayData(item, {
      labels,
      includeNote: false,
    });
    doc.setFontSize(10);
    doc.text(`${item.quantity}x ${title}`, 6, y);
    y += lineHeight;
    subtitleLines.forEach((line) => {
      doc.setFontSize(8);
      doc.text(`${line}`, 8, y);
      y += lineHeight;
      doc.setFontSize(10);
    });
  };

  kitchenItems.forEach(printItem);

  if (otherItems.length) {
    y += 2;
    doc.setFontSize(8);
    doc.text(`${labels.noPrepItems || "SIN PREPARACION"}:`, 6, y);
    y += lineHeight;
    otherItems.forEach(printItem);
  }

  y += 2;
  doc.line(4, y, 76, y);
  y += 6;

  doc.setFontSize(9);
  if (ticket.orderNotes?.length) {
    doc.text(`${labels.notes || "Notas"}:`, 6, y);
    y += lineHeight;
    ticket.orderNotes.forEach((note) => {
      doc.text(`- ${note}`, 8, y);
      y += lineHeight;
    });
    y += 2;
  }

  doc.text(ticket.terminalLabel || "Terminal", 6, y);
  doc.text(ticket.terminalValue || "-", 6, y + 4);

  y += 10;
  doc.text(labels.endOfTicket || "*** FIN DEL TICKET ***", center, y, { align: "center" });

  return doc;
}

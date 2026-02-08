const JSPDF_CDN =
  "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js";

const loadJsPdf = () =>
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

  const lineHeight = 4.5;
  const baseLines = 14;
  const itemLines = (ticket.items || []).reduce((count, item) => {
    const noteLines = Array.isArray(item.notes) ? item.notes.length : 0;
    return count + 1 + noteLines;
  }, 0);
  const height = Math.max(80, (baseLines + itemLines) * lineHeight);

  const doc = new jsPDF({
    unit: "mm",
    format: [80, height],
  });

  let y = 6;
  const center = 40;

  doc.setFontSize(12);
  doc.text("ORDEN DE COCINA", center, y, { align: "center" });

  y += 7;
  doc.setFontSize(16);
  doc.text(`#${ticket.orderNumber}`, center, y, { align: "center" });

  y += 6;
  doc.setFontSize(9);
  doc.text(ticket.tableLabel || "Mesa / Cliente", 6, y);
  doc.text(ticket.tableValue || "Sin asignar", 6, y + 4);

  y += 10;
  doc.text(ticket.datetimeLabel || "Fecha y hora", 6, y);
  doc.text(ticket.datetimeValue || "-", 6, y + 4);

  y += 9;
  doc.line(4, y, 76, y);

  y += 4;
  doc.setFontSize(10);
  (ticket.items || []).forEach((item) => {
    doc.text(`${item.quantity}x ${item.name}`, 6, y);
    y += lineHeight;
    (item.notes || []).forEach((note) => {
      doc.setFontSize(8);
      doc.text(`- ${note}`, 8, y);
      y += lineHeight;
      doc.setFontSize(10);
    });
  });

  y += 2;
  doc.line(4, y, 76, y);
  y += 6;

  doc.setFontSize(9);
  if (ticket.orderNotes?.length) {
    doc.text("Notas:", 6, y);
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
  doc.text("*** FIN DEL TICKET ***", center, y, { align: "center" });

  return doc;
}

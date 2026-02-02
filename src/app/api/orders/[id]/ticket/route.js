import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { generateTicketPDF } from "@/lib/pdf/ticketPdf";

export async function GET(req, { params }) {
  const { id: orderId } = await params;

  const tenant = await resolveTenant(req);
  const conn = await getTenantConnection(tenant.dbName);
  const Order = OrderModel(conn);

  const order = await Order.findById(orderId);

  if (!order || order.status !== "LISTO") {
    return new Response("Ticket not available", { status: 400 });
  }

  const doc = generateTicketPDF(order, tenant.name);

  const stream = new ReadableStream({
    start(controller) {
      doc.on("data", (chunk) => controller.enqueue(chunk));
      doc.on("end", () => controller.close());
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="ticket-${orderId}.pdf"`,
    },
  });
}

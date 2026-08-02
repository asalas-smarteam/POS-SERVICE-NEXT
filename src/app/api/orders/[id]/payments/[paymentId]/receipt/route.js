import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { generatePaymentReceiptPDF } from "@/lib/pdf/ticketPdf";

export async function GET(req, { params }) {
  const { id: orderId, paymentId } = await params;

  const tenant = await resolveTenant(req);
  await authorizeRequest(req, "orders");
  const conn = await getTenantConnection(tenant.dbName);
  const Order = OrderModel(conn);

  const order = await Order.findById(orderId);
  if (!order) {
    return new Response("Order not found", { status: 404 });
  }

  const payment = (order.payments || []).find((p) => p.id === paymentId);
  if (!payment) {
    return new Response("Payment not found", { status: 404 });
  }

  const doc = generatePaymentReceiptPDF(order, payment, tenant.name);

  const stream = new ReadableStream({
    start(controller) {
      doc.on("data", (chunk) => controller.enqueue(chunk));
      doc.on("end", () => controller.close());
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/pdf",
      // inline: se abre en el navegador para ver/imprimir.
      "Content-Disposition": `inline; filename="recibo-${paymentId}.pdf"`,
    },
  });
}

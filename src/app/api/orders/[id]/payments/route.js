import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { OrderModel } from "@/models/tenant/Order";
import { releaseOrderTable } from "@/lib/tenant/tableAssignment";
import {
  recomputePaymentState,
  getAmountDue,
  getRemainingAmount,
  getRemainingQuantity,
  getUnitPrice,
  hasPendingUnits,
  normalizeLineSelection,
  settleLines,
  sumLines,
  round2,
} from "@/lib/tenant/paymentsService";

const TERMINAL_STATUSES = ["COMPLETED", "CANCELLED", "DELETED"];
const METHODS = ["cash", "card", "other"];

function generatePaymentId() {
  return `pay_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function POST(req, { params }) {
  try {
    const { id: orderId } = await params;

    const tenant = await resolveTenant(req);
    const payload = await authorizeRequest(req, "orders");
    const conn = await getTenantConnection(tenant.dbName);
    const Order = OrderModel(conn);

    const order = await Order.findById(orderId);
    if (!order || order.isClosed || TERMINAL_STATUSES.includes(order.status)) {
      return NextResponse.json({ error: "Order not payable" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const mode = String(body?.mode || "custom");
    const method = METHODS.includes(body?.method) ? body.method : "cash";
    const note = typeof body?.note === "string" ? body.note.trim() : "";

    const amountDue = getAmountDue(order);
    if (amountDue <= 0) {
      return NextResponse.json({ error: "Order already fully paid" }, { status: 400 });
    }

    let amount = 0;
    // Unidades a asentar: [{ lineId, quantity }]. Vacio = el pago no se imputa a
    // lineas concretas (pagar todo / partes iguales).
    let settledSelections = [];
    let accountId = null;

    if (mode === "full") {
      amount = amountDue;
    } else if (mode === "equal") {
      const splitCount = Math.max(1, Math.floor(Number(body?.splitCount) || 1));
      amount = round2(round2(order.total) / splitCount);
    } else if (mode === "custom") {
      amount = round2(body?.amount);
    } else if (mode === "items") {
      // Forma actual: lines = [{ lineId, quantity }] (cobro parcial por
      // cantidad). Se acepta lineIds (linea completa) por compatibilidad.
      settledSelections = Array.isArray(body?.lines)
        ? body.lines
        : Array.isArray(body?.lineIds)
          ? body.lineIds
          : [];
      amount = sumLines(order, settledSelections);
    } else if (mode === "account") {
      accountId = String(body?.accountId || "");
      const accountLines = (order.items || []).filter(
        (it) => hasPendingUnits(it) && String(it.accountId || "") === accountId
      );
      amount = round2(
        accountLines.reduce((s, it) => s + getRemainingAmount(it), 0)
      );
      settledSelections = accountLines
        .filter((l) => l.lineId)
        .map((l) => ({ lineId: l.lineId, quantity: getRemainingQuantity(l) }));
    } else {
      return NextResponse.json({ error: "Invalid payment mode" }, { status: 400 });
    }

    if (!(amount > 0)) {
      return NextResponse.json({ error: "Nothing to pay" }, { status: 400 });
    }

    // Nunca cobrar mas de lo que se debe.
    amount = round2(Math.min(amount, amountDue));

    // Snapshot de lo cubierto por ESTE pago (para el recibo) y asentado. Se
    // toma antes de settleLines, y con las cantidades/importes parciales.
    let linesSnapshot = [];
    if (settledSelections.length) {
      const selection = normalizeLineSelection(order, settledSelections);
      linesSnapshot = (order.items || [])
        .filter((it) => selection.get(String(it.lineId)) > 0)
        .map((it) => {
          const quantity = selection.get(String(it.lineId));
          return {
            name: it.productName || it.name || "Item",
            quantity,
            totalPrice: round2(quantity * getUnitPrice(it)),
          };
        });
      settleLines(order, settledSelections);
    }

    const payment = {
      id: generatePaymentId(),
      amount,
      method,
      mode,
      accountId: accountId || null,
      note,
      lines: linesSnapshot,
      paidAt: new Date(),
      createdBy: {
        userId: payload?.userId || null,
        name: payload?.email || "",
      },
    };
    order.payments.push(payment);

    if (mode === "account" && accountId) {
      const acc = (order.subAccounts || []).find((a) => a.id === accountId);
      if (acc) {
        acc.isPaid = true;
        acc.paidAt = new Date();
      }
    }

    const state = recomputePaymentState(order);

    let closed = false;
    if (state.amountDue <= 0) {
      order.status = "COMPLETED";
      order.isClosed = true;
      order.closedAt = new Date();
      closed = true;
    }

    await order.save();

    if (closed) {
      await releaseOrderTable(conn, order);
    }

    return NextResponse.json({
      ok: true,
      orderId,
      paymentId: payment.id,
      amount,
      closed,
      ...state,
    });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

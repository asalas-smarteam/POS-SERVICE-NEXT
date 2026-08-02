"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Banknote, CreditCard, Loader2, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { TransferList } from "@/components/sales/transfer-list";
import { PaymentReceiptDialog } from "@/components/sales/payment-receipt-dialog";
import {
  getRemainingQuantity,
  getUnitPrice,
  hasPendingUnits,
} from "@/lib/tenant/paymentsService";
import { getTenantHeaders } from "../../../store/tenantHeaders";
import { useAuthStore } from "../../../store/authStore";

const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const METHODS = [
  { id: "cash", icon: Banknote },
  { id: "card", icon: CreditCard },
  { id: "other", icon: Wallet },
];

export function SplitPaymentDialog({ open, onOpenChange, order, onPaid }) {
  const t = useTranslations("Orders");
  const { formatCurrency } = useCurrencyFormatter();
  const tenant = useAuthStore((s) => s.tenant);

  const orderId = order?._id ?? order?.id ?? "";
  const total = round2(order?.total);
  const splitEnabled = Boolean(order?.splitEnabled);
  const subAccounts = Array.isArray(order?.subAccounts) ? order.subAccounts : [];

  const [items, setItems] = useState([]);
  const [paid, setPaid] = useState({ amountPaid: 0, amountDue: total, paymentStatus: "unpaid" });
  const [mode, setMode] = useState("full");
  const [method, setMethod] = useState("cash");
  const [equalCount, setEqualCount] = useState(2);
  // Cobro por productos: { lineId: unidades a cobrar en este pago }.
  const [selection, setSelection] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState(null);
  const [receiptOpen, setReceiptOpen] = useState(false);

  // (Re)inicializa el estado local cada vez que se abre con una orden.
  useEffect(() => {
    if (!open) return;
    const amountPaid = round2(order?.amountPaid);
    setItems(Array.isArray(order?.items) ? order.items : []);
    setPaid({
      amountPaid,
      amountDue: round2(Math.max(0, total - amountPaid)),
      paymentStatus: order?.paymentStatus || (amountPaid <= 0 ? "unpaid" : "partial"),
    });
    setMode("full");
    setMethod("cash");
    setEqualCount(Math.max(2, subAccounts.length || 2));
    setSelection({});
    setError("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, orderId]);

  // "Pendiente" = unidades sin cobrar, no lineas sin cobrar: una linea puede
  // estar cobrada a medias (2 de 10).
  const unsettledItems = useMemo(
    () => items.filter((it) => hasPendingUnits(it)),
    [items]
  );

  const transferItems = useMemo(
    () =>
      unsettledItems
        .filter((it) => it.lineId)
        .map((it) => ({
          id: it.lineId,
          name: it.productName || it.name || "Item",
          unitPrice: getUnitPrice(it),
          quantity: getRemainingQuantity(it),
        })),
    [unsettledItems]
  );

  const thisPaymentAmount = useMemo(
    () =>
      round2(
        transferItems.reduce(
          (sum, it) => sum + Number(selection[String(it.id)] ?? 0) * it.unitPrice,
          0
        )
      ),
    [selection, transferItems]
  );

  const selectedUnits = useMemo(
    () => Object.values(selection).reduce((sum, qty) => sum + Number(qty || 0), 0),
    [selection]
  );

  const equalShare = round2(total / Math.max(1, equalCount));

  const accountBreakdown = useMemo(() => {
    return subAccounts.map((acc) => ({
      ...acc,
      subtotal: round2(
        unsettledItems
          .filter((it) => String(it.accountId || "") === String(acc.id))
          .reduce((s, it) => s + getRemainingQuantity(it) * getUnitPrice(it), 0)
      ),
    }));
  }, [subAccounts, unsettledItems]);

  // Lineas que cubre este pago (para el recibo), calculadas ANTES de asentar.
  const snapshotLinesFor = (body) => {
    if (body.mode === "items" && Array.isArray(body.lines)) {
      const byLineId = new Map(body.lines.map((l) => [String(l.lineId), Number(l.quantity)]));
      return items
        .filter((it) => byLineId.get(String(it.lineId)) > 0)
        .map((it) => {
          const quantity = byLineId.get(String(it.lineId));
          return {
            name: it.productName || it.name,
            quantity,
            totalPrice: round2(quantity * getUnitPrice(it)),
          };
        });
    }
    if (body.mode === "account" && body.accountId) {
      return items
        .filter(
          (it) => hasPendingUnits(it) && String(it.accountId || "") === String(body.accountId)
        )
        .map((it) => {
          const quantity = getRemainingQuantity(it);
          return {
            name: it.productName || it.name,
            quantity,
            totalPrice: round2(quantity * getUnitPrice(it)),
          };
        });
    }
    return [];
  };

  // Abre la previsualizacion del recibo (mismo diseno que el ticket de cocina).
  // Desde ahi el cajero puede imprimir o descargar el PDF.
  const showReceipt = (body, data, lines) => {
    setReceipt({
      tenantName: tenant?.name || "POS",
      orderNumber: String(orderId).slice(-6),
      dateValue: new Date().toLocaleString(),
      methodValue: t(`method_${method}`),
      lines,
      modeLabel:
        body.mode === "equal"
          ? t("equalSplit")
          : body.mode === "full"
            ? t("payAll")
            : "",
      amount: data.amount,
      total,
      amountPaid: data.amountPaid,
      amountDue: data.amountDue,
    });
    setReceiptOpen(true);
  };

  const pay = async (body) => {
    if (submitting || !orderId) return;
    setSubmitting(true);
    setError("");
    try {
      const receiptLines = snapshotLinesFor(body);
      const res = await fetch(`/api/orders/${orderId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getTenantHeaders() },
        body: JSON.stringify({ ...body, method }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || t("payError"));
        return;
      }

      setPaid({
        amountPaid: data.amountPaid,
        amountDue: data.amountDue,
        paymentStatus: data.paymentStatus,
      });
      // Reflejo optimista: suma las unidades cobradas y marca la linea como
      // asentada solo si quedo cubierta por completo.
      const applyPaidUnits = (item, quantity) => {
        const paidQuantity = Math.min(
          Number(item.quantity || 0),
          Number(item.paidQuantity || 0) + quantity
        );
        return {
          ...item,
          paidQuantity,
          settled: paidQuantity > 0 && paidQuantity >= Number(item.quantity || 0),
        };
      };

      if (body.mode === "items" && Array.isArray(body.lines)) {
        const byLineId = new Map(body.lines.map((l) => [String(l.lineId), Number(l.quantity)]));
        setItems((prev) =>
          prev.map((it) => {
            const quantity = byLineId.get(String(it.lineId));
            return quantity > 0 ? applyPaidUnits(it, quantity) : it;
          })
        );
        setSelection({});
      }
      if (body.mode === "account" && body.accountId) {
        setItems((prev) =>
          prev.map((it) =>
            String(it.accountId || "") === String(body.accountId)
              ? applyPaidUnits(it, getRemainingQuantity(it))
              : it
          )
        );
      }

      toast.success(t("paymentDone", { amount: formatCurrency(data.amount) }));
      // Recibo por pago: previsualizacion HTML (imprimir / descargar PDF).
      showReceipt(body, data, receiptLines);
      onPaid?.(data);
      if (data.closed) {
        onOpenChange?.(false);
      }
    } catch (err) {
      setError(err?.message || t("payError"));
    } finally {
      setSubmitting(false);
    }
  };

  const fullyPaid = paid.amountDue <= 0.005;

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("splitPayTitle")}</DialogTitle>
        </DialogHeader>

        {/* Resumen de saldo */}
        <div className="grid grid-cols-3 gap-2 rounded-lg border bg-muted/30 p-3 text-center text-sm">
          <div>
            <p className="text-xs text-muted-foreground">{t("total")}</p>
            <p className="font-semibold">{formatCurrency(total)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("paidLabel")}</p>
            <p className="font-semibold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(paid.amountPaid)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{t("amountDue")}</p>
            <p className="font-semibold text-amber-600 dark:text-amber-400">
              {formatCurrency(paid.amountDue)}
            </p>
          </div>
        </div>

        {fullyPaid ? (
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-center text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {t("fullyPaid")}
          </div>
        ) : (
          <>
            {/* Selector de metodo de pago */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">{t("method")}:</span>
              {METHODS.map((m) => {
                const Icon = m.icon;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-sm transition ${
                      method === m.id
                        ? "border-blue-500 bg-blue-500/10 text-blue-600 dark:text-blue-400"
                        : "border-slate-200 text-muted-foreground hover:border-blue-400 dark:border-slate-700"
                    }`}
                  >
                    <Icon className="size-4" />
                    {t(`method_${m.id}`)}
                  </button>
                );
              })}
            </div>

            <Tabs value={mode} onValueChange={setMode} className="w-full">
              <TabsList className="w-full">
                <TabsTrigger value="full">{t("payAll")}</TabsTrigger>
                <TabsTrigger value="equal">{t("equalSplit")}</TabsTrigger>
                <TabsTrigger value="items">{t("selectItems")}</TabsTrigger>
                {splitEnabled && subAccounts.length > 0 ? (
                  <TabsTrigger value="account">{t("byPerson")}</TabsTrigger>
                ) : null}
              </TabsList>

              {/* Pagar todo */}
              <TabsContent value="full" className="pt-3">
                <Button
                  type="button"
                  className="w-full"
                  size="lg"
                  disabled={submitting}
                  onClick={() => pay({ mode: "full" })}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("confirmPayment", { amount: formatCurrency(paid.amountDue) })}
                </Button>
              </TabsContent>

              {/* Partes iguales */}
              <TabsContent value="equal" className="space-y-3 pt-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm text-muted-foreground">{t("people")}</span>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={equalCount}
                    onChange={(e) => setEqualCount(Math.max(1, Math.floor(Number(e.target.value) || 1)))}
                    className="w-24"
                  />
                  <span className="text-sm">
                    = <span className="font-semibold">{formatCurrency(equalShare)}</span> {t("perPerson")}
                  </span>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={submitting}
                  onClick={() => pay({ mode: "equal", splitCount: equalCount })}
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("chargeOneShare", { amount: formatCurrency(equalShare) })}
                </Button>
              </TabsContent>

              {/* Seleccionar productos (transfer list) */}
              <TabsContent value="items" className="space-y-3 pt-3">
                <TransferList
                  items={transferItems}
                  selection={selection}
                  onChange={setSelection}
                  leftTitle={t("pending")}
                  rightTitle={t("thisPayment")}
                  emptyLeft={t("noPendingItems")}
                  emptyRight={t("selectItemsHint")}
                  formatCurrency={formatCurrency}
                  holdHint={t("holdToSelectAll")}
                />
                <p className="text-xs text-muted-foreground">{t("holdToSelectAll")}</p>
                <div className="flex items-center justify-between rounded-lg bg-muted/40 px-3 py-2 text-sm">
                  <span>
                    {t("thisPayment")}: <span className="font-semibold">{formatCurrency(thisPaymentAmount)}</span>
                  </span>
                  <span className="text-muted-foreground">
                    {t("remainingAfter")}: {formatCurrency(Math.max(0, paid.amountDue - thisPaymentAmount))}
                  </span>
                </div>
                <Button
                  type="button"
                  className="w-full"
                  disabled={submitting || selectedUnits === 0}
                  onClick={() =>
                    pay({
                      mode: "items",
                      lines: Object.entries(selection)
                        .filter(([, quantity]) => Number(quantity) > 0)
                        .map(([lineId, quantity]) => ({ lineId, quantity: Number(quantity) })),
                    })
                  }
                >
                  {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
                  {t("confirmPayment", { amount: formatCurrency(thisPaymentAmount) })}
                </Button>
              </TabsContent>

              {/* Por persona */}
              {splitEnabled && subAccounts.length > 0 ? (
                <TabsContent value="account" className="space-y-2 pt-3">
                  {accountBreakdown.map((acc) => (
                    <div
                      key={acc.id}
                      className="flex items-center justify-between rounded-lg border px-3 py-2"
                    >
                      <div>
                        <p className="text-sm font-medium">{acc.name}</p>
                        <p className="text-xs text-muted-foreground">{formatCurrency(acc.subtotal)}</p>
                      </div>
                      {acc.isPaid || acc.subtotal <= 0 ? (
                        <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                          {t("paidLabel")}
                        </span>
                      ) : (
                        <Button
                          type="button"
                          size="sm"
                          disabled={submitting}
                          onClick={() => pay({ mode: "account", accountId: acc.id })}
                        >
                          {t("chargeAccount")}
                        </Button>
                      )}
                    </div>
                  ))}
                </TabsContent>
              ) : null}
            </Tabs>

            {error ? <p className="text-sm text-red-500">{error}</p> : null}
          </>
        )}
      </DialogContent>
    </Dialog>

    <PaymentReceiptDialog
      open={receiptOpen}
      onOpenChange={setReceiptOpen}
      receipt={receipt}
    />
    </>
  );
}

"use client";

import { useTranslations } from "next-intl";

const STATUS_META = {
  COMPLETED: { key: "statusPaid", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  CANCELLED: { key: "statusCancelled", className: "bg-rose-100 text-rose-700 border-rose-200" },
  READY: { key: "statusReady", className: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  IN_OVEN: { key: "statusInOven", className: "bg-orange-100 text-orange-700 border-orange-200" },
  IN_PREPARATION: { key: "statusInPreparation", className: "bg-blue-100 text-blue-700 border-blue-200" },
  PENDING: { key: "statusPending", className: "bg-amber-100 text-amber-700 border-amber-200" },
  DRAFT: { key: "statusDraft", className: "bg-slate-100 text-slate-700 border-slate-200" },
};

// The displayed status blends the lifecycle status with the kitchen progress so
// the user sees the most meaningful stage of each order.
function resolveStatusMeta(order) {
  if (order.status === "COMPLETED") return STATUS_META.COMPLETED;
  if (order.status === "CANCELLED") return STATUS_META.CANCELLED;
  if (order.kitchenStatus && STATUS_META[order.kitchenStatus]) {
    return STATUS_META[order.kitchenStatus];
  }
  return STATUS_META[order.status] ?? STATUS_META.PENDING;
}

function StatusBadge({ order, t }) {
  const meta = resolveStatusMeta(order);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${meta.className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {t(meta.key)}
    </span>
  );
}

export function RecentOrdersTable({ orders = [], currencyFormatter, loading = false }) {
  const t = useTranslations("Dashboard");
  const list = Array.isArray(orders) ? orders : [];

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0c1f30]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
        <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-100">{t("recentOrders")}</h3>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-[#061426] dark:text-slate-400">
              <th className="px-6 py-4">{t("orderId")}</th>
              <th className="px-6 py-4">{t("table")}</th>
              <th className="px-6 py-4">{t("waiter")}</th>
              <th className="px-6 py-4">{t("status")}</th>
              <th className="px-6 py-4 text-right">{t("total")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <tr>
                <td className="px-6 py-6 text-sm text-slate-400 dark:text-slate-500" colSpan={5}>
                  {t("loading")}
                </td>
              </tr>
            ) : list.length ? (
              list.map((order) => (
                <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40" key={order.id}>
                  <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{order.shortId}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{order.table || "—"}</td>
                  <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{order.waiter || "—"}</td>
                  <td className="px-6 py-4">
                    <StatusBadge order={order} t={t} />
                  </td>
                  <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">
                    {currencyFormatter.format(Number(order.total) || 0)}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="px-6 py-6 text-sm text-slate-400 dark:text-slate-500" colSpan={5}>
                  {t("noRecentOrders")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {list.length ? (
        <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-[#061426]">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("showingOrders", { shown: list.length, total: list.length })}
          </p>
        </footer>
      ) : null}
    </section>
  );
}

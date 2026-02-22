import { Filter, Plus } from "lucide-react";
import { recentOrders } from "./dashboard-data";

const statusStyles = {
  Pendiente: "bg-amber-100 text-amber-700 border-amber-200",
  Cocinando: "bg-blue-100 text-blue-700 border-blue-200",
  Servido: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Pagado: "bg-slate-100 text-slate-700 border-slate-200",
};

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        statusStyles[status] ?? statusStyles.Pagado
      }`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}

export function RecentOrdersTable() {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0c1f30]">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-6">
        <h3 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Pedidos Recientes</h3>
        <div className="flex items-center gap-2">
          <button className="inline-flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800">
            <Filter className="size-4" />
            Filtrar
          </button>
          <button className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-amber-600">
            <Plus className="size-4" />
            Nuevo Pedido
          </button>
        </div>
      </header>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:bg-[#061426] dark:text-slate-400">
              <th className="px-6 py-4">Orden ID</th>
              <th className="px-6 py-4">Mesa</th>
              <th className="px-6 py-4">Mesero</th>
              <th className="px-6 py-4">Estado</th>
              <th className="px-6 py-4 text-right">Total</th>
              <th className="px-6 py-4" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {recentOrders.map((order) => (
              <tr className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40" key={order.id}>
                <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{order.id}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{order.table}</td>
                <td className="px-6 py-4 text-slate-700 dark:text-slate-300">{order.waiter}</td>
                <td className="px-6 py-4">
                  <StatusBadge status={order.status} />
                </td>
                <td className="px-6 py-4 text-right font-bold text-slate-900 dark:text-slate-100">{order.total}</td>
                <td className="px-6 py-4 text-right text-slate-400 dark:text-slate-500">⋮</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <footer className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-[#061426]">
        <p className="text-sm text-slate-500 dark:text-slate-400">Mostrando 4 de 124 pedidos</p>
        <div className="flex gap-2 text-sm">
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-[#0c1f30] dark:text-slate-200">Anterior</button>
          <button className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-slate-700 dark:border-slate-700 dark:bg-[#0c1f30] dark:text-slate-200">Siguiente</button>
        </div>
      </footer>
    </section>
  );
}

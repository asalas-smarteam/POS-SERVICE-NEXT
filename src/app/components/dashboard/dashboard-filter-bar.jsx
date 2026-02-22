import { CalendarDays, ChevronDown, Download, RefreshCw, Shapes } from "lucide-react";

const selectClassName =
  "appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-8 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-[#061426] dark:text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";

export function DashboardFilterBar() {
  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0c1f30] md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <select className={selectClassName} defaultValue="today">
            <option value="today">Hoy</option>
            <option value="week">Últimos 7 días</option>
            <option value="month">Últimos 30 días</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="relative">
          <Shapes className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <select className={selectClassName} defaultValue="all">
            <option value="all">Todas las Categorías</option>
            <option value="main">Platos Fuertes</option>
            <option value="drinks">Bebidas</option>
            <option value="desserts">Postres</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <Download className="size-4" />
          Exportar
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600">
          <RefreshCw className="size-4" />
          Actualizar
        </button>
      </div>
    </section>
  );
}

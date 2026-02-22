import { salesHours } from "./dashboard-data";

export function SalesFlowCard() {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0c1f30] lg:col-span-2">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 p-6 dark:border-slate-800">
        <div>
          <h3 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Flujo de Ventas</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">Seguimiento de ventas en tiempo real por hora</p>
        </div>
        <div className="flex items-center rounded-lg bg-slate-100 p-1 text-sm dark:bg-slate-800">
          <button className="rounded-md bg-white px-4 py-1.5 font-medium text-slate-900 shadow-sm dark:bg-[#061426] dark:text-slate-100">Vista Actual</button>
          <button className="px-4 py-1.5 font-medium text-slate-500 dark:text-slate-300">Comparativa</button>
        </div>
      </header>

      <div className="p-6">
        <div className="relative h-72">
          <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 1000 260">
            <path
              d="M0 210 Q 80 80, 150 190 T 300 160 T 420 210 T 520 40 T 640 200 T 740 20 T 860 210 T 1000 120 L1000 260 L0 260 Z"
              className="fill-amber-100/60"
            />
            <path
              d="M0 210 Q 80 80, 150 190 T 300 160 T 420 210 T 520 40 T 640 200 T 740 20 T 860 210 T 1000 120"
              className="fill-none stroke-amber-500"
              strokeWidth="3"
            />
          </svg>
          <div className="mt-4 flex justify-between px-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            {salesHours.map((hour) => (
              <span key={hour}>{hour}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

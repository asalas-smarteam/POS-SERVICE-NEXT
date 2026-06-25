"use client";

import { useTranslations } from "next-intl";

function DishAvatar({ name }) {
  const initial = String(name ?? "?").trim().charAt(0).toUpperCase() || "?";
  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-base font-bold text-amber-700 dark:bg-amber-500/20 dark:text-amber-300">
      {initial}
    </div>
  );
}

function TopDishRow({ dish, currencyFormatter, t }) {
  return (
    <div className="flex items-center gap-4">
      <DishAvatar name={dish.name} />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{dish.name}</p>
            <p className="truncate text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {dish.category || t("uncategorized")}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="whitespace-nowrap text-sm font-bold text-slate-900 dark:text-slate-100">
              {currencyFormatter.format(Number(dish.revenue) || 0)}
            </p>
            <p className="whitespace-nowrap text-[10px] text-slate-400 dark:text-slate-500">
              {Number(dish.salesCount) || 0} {t("sales")}
            </p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${dish.progress ?? 0}%` }} />
        </div>
      </div>
    </div>
  );
}

export function TopDishesCard({ products = [], currencyFormatter, loading = false }) {
  const t = useTranslations("Dashboard");
  const list = Array.isArray(products) ? products : [];

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0c1f30]">
      <header className="border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
        <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-100">{t("topProducts")}</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">{t("performanceByPopularity")}</p>
      </header>

      <div className="flex-1 space-y-6 p-5 sm:p-6">
        {loading ? (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("loading")}</p>
        ) : list.length ? (
          list.map((dish) => (
            <TopDishRow currencyFormatter={currencyFormatter} dish={dish} key={dish.id || dish.name} t={t} />
          ))
        ) : (
          <p className="text-sm text-slate-400 dark:text-slate-500">{t("noSalesInPeriod")}</p>
        )}
      </div>
    </section>
  );
}

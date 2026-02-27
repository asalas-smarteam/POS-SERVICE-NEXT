"use client";

import Image from "next/image";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { topDishes } from "./dashboard-data";

function TopDishRow({ dish, currencyFormatter, t }) {
  const rawTotal = Number.parseFloat(String(dish.total).replace(/[^0-9.-]+/g, ""));
  const salesCount = Number.parseInt(String(dish.sales).replace(/\D+/g, ""), 10);

  return (
    <div className="flex items-center gap-4">
      <Image alt={dish.name} className="h-12 w-12 rounded-lg object-cover" height={48} src={dish.image} width={48} unoptimized />
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex items-start justify-between gap-2">
          <div>
            <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{dish.name}</p>
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{dish.category}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{currencyFormatter.format(rawTotal || 0)}</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">{salesCount || 0} {t("sales")}</p>
          </div>
        </div>
        <div className="h-1.5 rounded-full bg-slate-100 dark:bg-slate-800">
          <div className="h-full rounded-full bg-amber-500" style={{ width: `${dish.progress}%` }} />
        </div>
      </div>
    </div>
  );
}

export function TopDishesCard() {
  const t = useTranslations("Dashboard");
  const params = useParams();
  const locale = params?.locale === "es" ? "es" : "en";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: locale === "es" ? "CRC" : "USD",
  });

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0c1f30]">
      <header className="border-b border-slate-200 p-6 dark:border-slate-800">
        <h3 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">{t("topProducts")}</h3>
        <p className="text-lg text-slate-500 dark:text-slate-400">{t("performanceByPopularity")}</p>
      </header>

      <div className="space-y-6 p-6">
        {topDishes.map((dish) => (
          <TopDishRow currencyFormatter={currencyFormatter} dish={dish} key={dish.name} t={t} />
        ))}
      </div>

      <div className="border-t border-slate-200 p-4 dark:border-slate-800">
        <button className="w-full rounded-lg border border-amber-200 py-2 text-xs font-medium text-amber-500 transition-colors hover:bg-amber-50 dark:border-amber-600/40 dark:text-amber-400 dark:hover:bg-amber-500/10">
          {t("viewAllProducts")}
        </button>
      </div>
    </section>
  );
}

"use client";

import { CalendarDays, ChevronDown, Download, RefreshCw, Shapes } from "lucide-react";
import { useTranslations } from "next-intl";

const selectClassName =
  "appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-8 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-[#061426] dark:text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";

export function DashboardFilterBar() {
  const t = useTranslations("Dashboard");

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0c1f30] md:flex-row md:items-center md:justify-between">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <select className={selectClassName} defaultValue="today">
            <option value="today">{t("today")}</option>
            <option value="week">{t("last7Days")}</option>
            <option value="month">{t("last30Days")}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="relative">
          <Shapes className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <select className={selectClassName} defaultValue="all">
            <option value="all">{t("allCategories")}</option>
            <option value="main">{t("mainDishes")}</option>
            <option value="drinks">{t("drinks")}</option>
            <option value="desserts">{t("desserts")}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800">
          <Download className="size-4" />
          {t("export")}
        </button>
        <button className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600">
          <RefreshCw className="size-4" />
          {t("refresh")}
        </button>
      </div>
    </section>
  );
}

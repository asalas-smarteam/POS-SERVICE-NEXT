"use client";

import { CalendarDays, ChevronDown, Download, RefreshCw, Shapes } from "lucide-react";
import { useTranslations } from "next-intl";

const selectClassName =
  "w-full appearance-none rounded-lg border border-slate-200 bg-slate-50 py-2 pl-10 pr-8 text-sm font-medium text-slate-700 dark:border-slate-700 dark:bg-[#061426] dark:text-slate-200 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-200";

export function DashboardFilterBar({
  range = "today",
  onRangeChange,
  categoryId = "all",
  onCategoryChange,
  categories = [],
  onRefresh,
  onExport,
  loading = false,
}) {
  const t = useTranslations("Dashboard");
  const categoryOptions = Array.isArray(categories) ? categories : [];

  return (
    <section className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0c1f30] lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="relative w-full sm:w-48">
          <CalendarDays className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <select
            className={selectClassName}
            value={range}
            onChange={(event) => onRangeChange?.(event.target.value)}
          >
            <option value="today">{t("today")}</option>
            <option value="week">{t("last7Days")}</option>
            <option value="month">{t("last30Days")}</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>

        <div className="relative w-full sm:w-56">
          <Shapes className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
          <select
            className={selectClassName}
            value={categoryId}
            onChange={(event) => onCategoryChange?.(event.target.value)}
          >
            <option value="all">{t("allCategories")}</option>
            {categoryOptions.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label ?? category.id}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <Download className="size-4" />
          {t("export")}
        </button>
        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-4 py-2 text-sm font-medium text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-70"
        >
          <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>
    </section>
  );
}

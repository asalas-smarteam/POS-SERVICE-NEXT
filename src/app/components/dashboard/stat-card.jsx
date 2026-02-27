"use client";

import { Equal, TrendingDown, TrendingUp } from "lucide-react";
import { useTranslations } from "next-intl";

const trendStyles = {
  up: "bg-emerald-50 text-emerald-600",
  down: "bg-rose-50 text-rose-600",
  neutral: "bg-blue-50 text-blue-600",
};

const trendIcons = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Equal,
};

export function StatCard({ title, value, trend, trendType, description }) {
  const t = useTranslations("Dashboard");
  const TrendIcon = trendIcons[trendType] ?? Equal;
  const trendClassName = trendStyles[trendType] ?? trendStyles.neutral;

  return (
    <article className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-[#0c1f30]">
      <div className="mb-4 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title ?? t("noData")}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${trendClassName}`}>
          <TrendIcon className="size-3" />
          {trend}
        </span>
      </div>
      <p className="text-4xl font-bold text-slate-900 md:text-5xl dark:text-slate-100">{value ?? "-"}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{description ?? t("noData")}</p>
    </article>
  );
}

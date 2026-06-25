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
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-[#0c1f30]">
      <div className="mb-4 flex items-start justify-between gap-2">
        <span className="min-w-0 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{title ?? t("noData")}</span>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-xs font-medium ${trendClassName}`}>
          <TrendIcon className="size-3" />
          {trend}
        </span>
      </div>
      <p className="break-words text-2xl font-bold leading-tight text-slate-900 tabular-nums sm:text-3xl xl:text-4xl dark:text-slate-100">{value ?? "-"}</p>
      <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{description ?? t("noData")}</p>
    </article>
  );
}

"use client";

import { useMemo } from "react";
import { useTranslations } from "next-intl";

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 260;
const TOP_PADDING = 20;
const BOTTOM_BASELINE = 235;

function buildChartPaths(series) {
  const values = series.map((point) => Number(point.value) || 0);
  const maxValue = Math.max(...values, 0);

  if (!series.length) {
    return { linePath: "", areaPath: "", hasData: false };
  }

  const stepX = series.length > 1 ? VIEW_WIDTH / (series.length - 1) : 0;
  const scaleY = (value) => {
    if (maxValue <= 0) {
      return BOTTOM_BASELINE;
    }
    const usableHeight = BOTTOM_BASELINE - TOP_PADDING;
    return BOTTOM_BASELINE - (value / maxValue) * usableHeight;
  };

  const points = series.map((point, index) => {
    const x = series.length > 1 ? index * stepX : VIEW_WIDTH / 2;
    return { x, y: scaleY(Number(point.value) || 0) };
  });

  const linePath = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`)
    .join(" ");

  const areaPath = `${linePath} L ${VIEW_WIDTH} ${VIEW_HEIGHT} L 0 ${VIEW_HEIGHT} Z`;

  return { linePath, areaPath, hasData: maxValue > 0 };
}

export function SalesFlowCard({ series = [], loading = false }) {
  const t = useTranslations("Dashboard");
  const safeSeries = useMemo(() => (Array.isArray(series) ? series : []), [series]);

  const { linePath, areaPath, hasData } = useMemo(
    () => buildChartPaths(safeSeries),
    [safeSeries]
  );

  // Avoid cramming every label when there are many buckets (e.g. month view).
  const labelStep = safeSeries.length > 12 ? Math.ceil(safeSeries.length / 8) : 1;

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-[#0c1f30] lg:col-span-2">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 p-5 dark:border-slate-800 sm:p-6">
        <div className="min-w-0">
          <h3 className="text-xl font-semibold text-slate-900 sm:text-2xl dark:text-slate-100">{t("salesFlow")}</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t("realTimeSalesByHour")}</p>
        </div>
        <span className="shrink-0 rounded-md bg-slate-100 px-4 py-1.5 text-sm font-medium text-slate-900 dark:bg-slate-800 dark:text-slate-100">
          {t("currentView")}
        </span>
      </header>

      <div className="p-5 sm:p-6">
        <div className="relative h-72">
          {loading ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              {t("loading")}
            </div>
          ) : hasData ? (
            <svg className="h-[230px] w-full" preserveAspectRatio="none" viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}>
              <path d={areaPath} className="fill-amber-100/60" />
              <path d={linePath} className="fill-none stroke-amber-500" strokeWidth="3" />
            </svg>
          ) : (
            <div className="flex h-[230px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
              {t("noSalesInPeriod")}
            </div>
          )}
          <div className="mt-4 flex justify-between gap-1 px-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            {safeSeries.map((point, index) =>
              index % labelStep === 0 ? <span key={`${point.label}-${index}`}>{point.label}</span> : null
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

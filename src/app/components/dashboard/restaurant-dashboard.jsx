"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DashboardFilterBar } from "./dashboard-filter-bar";
import { RecentOrdersTable } from "./recent-orders-table";
import { SalesFlowCard } from "./sales-flow-card";
import { StatCard } from "./stat-card";
import { TopDishesCard } from "./top-dishes-card";
import { AppAlert } from "@/components/app-alert";
import { useSettingsStore } from "../../../store/settingsStore";
import { getTenantHeaders } from "../../../store/tenantHeaders";

const EMPTY_METRICS = {
  stats: {
    totalSales: 0,
    totalSalesTrend: 0,
    totalOrders: 0,
    totalOrdersTrend: 0,
    pendingOrders: 0,
    averageTicket: 0,
    averageTicketTrend: 0,
    growth: 0,
  },
  salesSeries: [],
  topProducts: [],
  recentOrders: [],
};

const resolveTrendType = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric === 0) {
    return "neutral";
  }
  return numeric > 0 ? "up" : "down";
};

const formatTrend = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return "0.0%";
  }
  const sign = numeric > 0 ? "+" : "";
  return `${sign}${numeric.toFixed(1)}%`;
};

export function RestaurantDashboard({ pageTitle }) {
  const t = useTranslations("Dashboard");
  const params = useParams();
  const locale = params?.locale === "es" ? "es" : "en";

  const { categories, fetchSettings } = useSettingsStore((state) => ({
    categories: state.categories,
    fetchSettings: state.fetchSettings,
  }));

  const [range, setRange] = useState("today");
  const [categoryId, setCategoryId] = useState("all");
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat(locale, {
        style: "currency",
        currency: locale === "es" ? "CRC" : "USD",
        maximumFractionDigits: 2,
      }),
    [locale]
  );

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const loadMetrics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const query = new URLSearchParams({ range, category: categoryId });
      const response = await fetch(`/api/dashboard?${query.toString()}`, {
        headers: { ...getTenantHeaders() },
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(body?.error || t("loadError"));
      }
      setMetrics({ ...EMPTY_METRICS, ...body, stats: { ...EMPTY_METRICS.stats, ...body?.stats } });
    } catch (err) {
      setError(err?.message || t("loadError"));
      setMetrics(EMPTY_METRICS);
    } finally {
      setLoading(false);
    }
  }, [range, categoryId, t]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleExport = useCallback(() => {
    const rows = [
      [t("orderId"), t("table"), t("waiter"), t("status"), t("total")],
      ...metrics.recentOrders.map((order) => [
        order.shortId,
        order.table,
        order.waiter,
        order.status,
        order.total,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `dashboard-${range}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }, [metrics.recentOrders, range, t]);

  const stats = useMemo(() => {
    const s = metrics.stats;
    return [
      {
        title: t("totalSales"),
        value: currencyFormatter.format(s.totalSales || 0),
        trend: formatTrend(s.totalSalesTrend),
        trendType: resolveTrendType(s.totalSalesTrend),
        description: t("salesInPeriod"),
      },
      {
        title: t("totalOrders"),
        value: String(s.totalOrders || 0),
        trend: formatTrend(s.totalOrdersTrend),
        trendType: resolveTrendType(s.totalOrdersTrend),
        description: t("pendingOrdersCount", { count: s.pendingOrders || 0 }),
      },
      {
        title: t("averageTicket"),
        value: currencyFormatter.format(s.averageTicket || 0),
        trend: formatTrend(s.averageTicketTrend),
        trendType: resolveTrendType(s.averageTicketTrend),
        description: t("perCompletedOrder"),
      },
      {
        title: t("growthVsYesterday"),
        value: formatTrend(s.growth),
        trend: formatTrend(s.growth),
        trendType: resolveTrendType(s.growth),
        description: t("comparedToPreviousPeriod"),
      },
    ];
  }, [metrics.stats, currencyFormatter, t]);

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-4 sm:p-6 dark:bg-[#061426]">
      <main className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 sm:gap-8">
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl dark:text-slate-100">
          {pageTitle ?? t("title")}
        </h1>

        <DashboardFilterBar
          range={range}
          onRangeChange={setRange}
          categoryId={categoryId}
          onCategoryChange={setCategoryId}
          categories={categories}
          onRefresh={loadMetrics}
          onExport={handleExport}
          loading={loading}
        />

        {error ? <AppAlert type="error" message={error} /> : null}

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:gap-8">
          <SalesFlowCard series={metrics.salesSeries} loading={loading} />
          <TopDishesCard
            products={metrics.topProducts}
            currencyFormatter={currencyFormatter}
            loading={loading}
          />
        </section>

        <RecentOrdersTable
          orders={metrics.recentOrders}
          currencyFormatter={currencyFormatter}
          loading={loading}
        />
      </main>
    </div>
  );
}

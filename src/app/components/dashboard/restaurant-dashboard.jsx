"use client";

import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { DashboardFilterBar } from "./dashboard-filter-bar";
import { RecentOrdersTable } from "./recent-orders-table";
import { SalesFlowCard } from "./sales-flow-card";
import { StatCard } from "./stat-card";
import { TopDishesCard } from "./top-dishes-card";

export function RestaurantDashboard({ pageTitle }) {
  const t = useTranslations("Dashboard");
  const params = useParams();
  const locale = params?.locale === "es" ? "es" : "en";
  const currencyFormatter = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: locale === "es" ? "CRC" : "USD",
  });

  const stats = [
    {
      title: t("totalSales"),
      value: currencyFormatter.format(1250),
      trend: "+12.5%",
      trendType: "up",
      description: t("upwardTrendToday"),
    },
    {
      title: t("totalOrders"),
      value: "124",
      trend: "-4%",
      trendType: "down",
      description: t("pendingOrders"),
    },
    {
      title: t("averageTicket"),
      value: currencyFormatter.format(18.45),
      trend: "+8.2%",
      trendType: "up",
      description: t("dessertImprovement"),
    },
    {
      title: t("growthVsYesterday"),
      value: "4.5%",
      trend: "0.0%",
      trendType: "neutral",
      description: t("stableComparedYesterday"),
    },
  ];

  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6 dark:bg-[#061426]">
      <main className="mx-auto flex w-full flex-col gap-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">{pageTitle ?? t("title")}</h1>
        <DashboardFilterBar />

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {stats.map((stat) => (
            <StatCard key={stat.title} {...stat} />
          ))}
        </section>

        <section className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <SalesFlowCard />
          <TopDishesCard />
        </section>

        <RecentOrdersTable />
      </main>
    </div>
  );
}

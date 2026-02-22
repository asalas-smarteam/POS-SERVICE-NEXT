import { DashboardFilterBar } from "./dashboard-filter-bar";
import { dashboardStats } from "./dashboard-data";
import { RecentOrdersTable } from "./recent-orders-table";
import { SalesFlowCard } from "./sales-flow-card";
import { StatCard } from "./stat-card";
import { TopDishesCard } from "./top-dishes-card";

export function RestaurantDashboard() {
  return (
    <div className="flex-1 overflow-auto bg-slate-50 p-6">
      <main className="mx-auto flex w-full flex-col gap-8">
        <DashboardFilterBar />

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
          {dashboardStats.map((stat) => (
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

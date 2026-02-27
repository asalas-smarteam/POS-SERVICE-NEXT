import { getTranslations } from "next-intl/server";
import { RestaurantDashboard } from "@/components/dashboard/restaurant-dashboard";

export default async function Page() {
  const t = await getTranslations("Dashboard");

  return <RestaurantDashboard pageTitle={t("title")} />;
}

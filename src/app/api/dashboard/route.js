import { NextResponse } from "next/server";
import { requireModuleAccess } from "@/lib/security/featureAccess";
import { getTenantConnection } from "@/lib/db/connections";
import { getDashboardMetrics } from "@/lib/tenant/dashboardMetrics";
import { hasFeature } from "@/lib/features/featureRegistry";

const ALLOWED_RANGES = ["today", "week", "month"];

export async function GET(req) {
  try {
    const { tenant } = await requireModuleAccess(req, "dashboard");
    const conn = await getTenantConnection(tenant.dbName);

    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get("range");
    const range = ALLOWED_RANGES.includes(rangeParam) ? rangeParam : "today";
    const categoryId = searchParams.get("category") || "all";

    const metrics = await getDashboardMetrics(conn, {
      range,
      categoryId,
      includeKitchenStatus: hasFeature(tenant.features, "kitchen"),
    });
    return NextResponse.json(metrics);
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Dashboard error" }, { status });
  }
}

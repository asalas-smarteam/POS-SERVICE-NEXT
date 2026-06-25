import { NextResponse } from "next/server";
import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { getTenantConnection } from "@/lib/db/connections";
import { getDashboardMetrics } from "@/lib/tenant/dashboardMetrics";

const ALLOWED_RANGES = ["today", "week", "month"];

export async function GET(req) {
  try {
    const tenant = await resolveTenant(req);
    await authorizeRequest(req, "dashboard");
    const conn = await getTenantConnection(tenant.dbName);

    const { searchParams } = new URL(req.url);
    const rangeParam = searchParams.get("range");
    const range = ALLOWED_RANGES.includes(rangeParam) ? rangeParam : "today";
    const categoryId = searchParams.get("category") || "all";

    const metrics = await getDashboardMetrics(conn, { range, categoryId });
    return NextResponse.json(metrics);
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json({ error: error?.message || "Dashboard error" }, { status });
  }
}

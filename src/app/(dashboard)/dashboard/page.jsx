import { redirect } from "next/navigation";
import { getCurrentTenantId } from "@/lib/auth/getCurrentTenantId";

export default async function DashboardRedirectPage() {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    redirect("/login");
  }

  redirect(`/dashboard/${tenantId}`);
}

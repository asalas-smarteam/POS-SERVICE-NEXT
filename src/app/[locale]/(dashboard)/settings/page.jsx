import { redirect } from "next/navigation";
import { getCurrentTenantId } from "@/lib/auth/getCurrentTenantId";

export default async function SettingsRedirectPage() {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    redirect("/login");
  }

  redirect(`/settings/${tenantId}`);
}

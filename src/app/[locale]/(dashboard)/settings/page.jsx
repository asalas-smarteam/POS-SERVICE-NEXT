import { redirect } from "next/navigation";
import { getCurrentTenantId } from "@/lib/auth/getCurrentTenantId";

export default async function SettingsRedirectPage({ params }) {
  const tenantId = await getCurrentTenantId();
  const locale = String(params?.locale ?? "");

  if (!tenantId || !locale) {
    redirect(`/${locale || "en"}/login`);
  }

  redirect(`/${locale}/settings/${tenantId}`);
}

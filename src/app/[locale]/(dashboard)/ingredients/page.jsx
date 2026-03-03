import { redirect } from "next/navigation";
import { getCurrentTenantId } from "@/lib/auth/getCurrentTenantId";
import { defaultLocale } from "../../../../../i18n";

export default async function IngredientsRedirectPage({ params }) {
  const tenantId = await getCurrentTenantId();
  const locale = String(params?.locale ?? "");

  if (!tenantId || !locale) {
    redirect(`/${locale || defaultLocale}/login`);
  }

  redirect(`/${locale}/ingredients/${tenantId}`);
}

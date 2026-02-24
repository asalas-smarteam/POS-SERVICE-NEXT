import { redirect } from "next/navigation";
import { getCurrentTenantId } from "@/lib/auth/getCurrentTenantId";

export default async function IngredientsRedirectPage() {
  const tenantId = await getCurrentTenantId();

  if (!tenantId) {
    redirect("/login");
  }

  redirect(`/ingredients/${tenantId}`);
}

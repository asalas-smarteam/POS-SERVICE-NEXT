import { useAuthStore } from "./authStore";

const asNonEmptyString = (value) => {
  if (typeof value !== "string") {
    return "";
  }
  const normalized = value.trim();
  return normalized;
};

export const getTenantHeaders = () => {
  const { tenant, tenantId } = useAuthStore.getState();

  const normalizedTenantId =
    asNonEmptyString(tenantId) ||
    asNonEmptyString(tenant?.tenantId) ||
    asNonEmptyString(tenant?.id) ||
    (typeof tenant === "string" ? asNonEmptyString(tenant) : "");

  const normalizedTenantSlug =
    asNonEmptyString(tenant?.slug) ||
    (typeof tenant === "string" ? asNonEmptyString(tenant) : "");

  return {
    ...(normalizedTenantId ? { "x-tenant-id": normalizedTenantId } : {}),
    ...(normalizedTenantSlug ? { "x-tenant": normalizedTenantSlug } : {}),
  };
};

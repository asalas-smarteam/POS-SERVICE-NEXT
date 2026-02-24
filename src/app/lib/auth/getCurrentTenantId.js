const TENANT_ROUTE_MATCHER = /^\/(dashboard|orders|kitchen|users|products|ingredients|settings)\/([^/?#]+)/i;

const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    if (typeof window === "undefined") {
      return JSON.parse(Buffer.from(payload, "base64").toString("utf-8"));
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = window.atob(normalized);
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

const getTokenFromPersistedAuth = () => {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    const persisted = window.localStorage.getItem("pos-auth");
    if (!persisted) {
      return null;
    }

    const parsed = JSON.parse(persisted);
    return parsed?.state?.token ?? null;
  } catch {
    return null;
  }
};

export const getTenantIdFromPathname = (pathname = "") => {
  const match = pathname.match(TENANT_ROUTE_MATCHER);
  return match?.[2] ? String(match[2]) : null;
};

export const getTenantIdFromClient = (pathname = "") => {
  const fromPath = getTenantIdFromPathname(pathname);
  if (fromPath) {
    return fromPath;
  }

  const token = getTokenFromPersistedAuth();
  const payload = decodeJwtPayload(token);
  return payload?.tenantId ? String(payload.tenantId) : null;
};

export async function getCurrentTenantId() {
  try {
    const [{ cookies }, { verifyToken }] = await Promise.all([
      import("next/headers"),
      import("@/lib/auth/jwt"),
    ]);

    const cookieStore = await cookies();
    const token = cookieStore.get("auth_token")?.value;

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);
    return payload?.tenantId ? String(payload.tenantId) : null;
  } catch {
    return null;
  }
}

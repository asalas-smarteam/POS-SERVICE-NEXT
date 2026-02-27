"use client";

import { useEffect, useMemo } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getTenantIdFromClient } from "@/lib/auth/getCurrentTenantId";
import { useAuthStore } from "../../../store/authStore";

const SAFE_DEFAULT_PATH = "/home";

const LOCALE_PATTERN = /^[a-z]{2}(?:-[A-Z]{2})?$/;

const normalizePath = (path = "") => {
  if (!path) {
    return "/";
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") {
    return normalized;
  }
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
};

const withTenantPath = (path, tenantId, locale) => {
  const normalized = normalizePath(path);
  const parts = normalized.split("/").filter(Boolean);
  const hasLocalePrefix = LOCALE_PATTERN.test(parts[0]);
  const sectionIndex = hasLocalePrefix ? 1 : 0;
  const section = parts[sectionIndex] || "";

  if (!["dashboard", "orders", "kitchen", "users", "products", "ingredients", "settings"].includes(section)) {
    return normalized;
  }

  const nextParts = [...parts];

  if (locale) {
    if (hasLocalePrefix) {
      nextParts[0] = locale;
    } else {
      nextParts.unshift(locale);
    }
  }

  const tenantIndex = hasLocalePrefix || locale ? 2 : 1;

  if (tenantId) {
    nextParts[tenantIndex] = tenantId;
  }

  return `/${nextParts.filter(Boolean).join("/")}`;
};

const getFirstAllowedPath = (items = [], tenantId = "", locale = "") => {
  for (const item of items) {
    if (!item) continue;
    const href = item.href ?? item.url;
    if (href) return withTenantPath(href, tenantId, locale);
    const child = getFirstAllowedPath(Array.isArray(item.items) ? item.items : [], tenantId, locale);
    if (child) return child;
  }
  return SAFE_DEFAULT_PATH;
};

const findNavItemByPath = (items, path, tenantId, locale) => {
  if (!Array.isArray(items)) {
    return null;
  }

  for (const item of items) {
    if (!item) {
      continue;
    }

    const itemPath = withTenantPath(item.href ?? item.url ?? "", tenantId, locale);
    if (itemPath && itemPath === path) {
      return item;
    }

    const children = Array.isArray(item.items) ? item.items : [];
    const childMatch = findNavItemByPath(children, path, tenantId, locale);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const hasAccess = useAuthStore((state) => state.hasAccess);
  const navMain = useAuthStore((state) => state.navMain);
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);
  const storeTenantId = useAuthStore((state) => state.tenantId);

  const safeNavMain = useMemo(
    () => (Array.isArray(navMain) ? navMain : []),
    [navMain]
  );

  const normalizedPath = useMemo(() => normalizePath(pathname || SAFE_DEFAULT_PATH), [pathname]);
  const locale = useMemo(() => String(params?.locale ?? ""), [params]);
  const tenantIdFromPath = useMemo(() => getTenantIdFromClient(normalizedPath) ?? "", [normalizedPath]);
  const tenantIdFromParams = useMemo(() => String(params?.tenantId ?? ""), [params]);
  const activeTenantId = tenantIdFromPath || tenantIdFromParams;

  const firstAllowedPath = useMemo(
    () => getFirstAllowedPath(safeNavMain, activeTenantId, locale),
    [safeNavMain, activeTenantId, locale]
  );

  const headerTitle = useMemo(() => {
    const match = findNavItemByPath(safeNavMain, normalizePath(normalizedPath), activeTenantId, locale);
    return match?.label ?? match?.title ?? "Dashboard";
  }, [normalizedPath, safeNavMain, activeTenantId, locale]);

  const hasSession = Boolean(isAuthenticated && (token || user));
  const hasTenantMismatch = Boolean(activeTenantId && storeTenantId && activeTenantId !== storeTenantId);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!hasSession) {
      router.replace(`/${locale}/login`);
      return;
    }

    if (hasTenantMismatch) {
      router.replace(`/${locale}/dashboard/${storeTenantId}`);
      return;
    }

    if (!hasAccess(normalizedPath) && normalizedPath !== firstAllowedPath) {
      router.replace(firstAllowedPath);
    }
  }, [firstAllowedPath, hasAccess, hasHydrated, hasSession, hasTenantMismatch, locale, normalizedPath, router, storeTenantId]);

  if (!hasHydrated) {
    return null;
  }

  if (!hasSession || hasTenantMismatch) {
    return null;
  }

  if (!hasAccess(normalizedPath) && normalizedPath !== firstAllowedPath) {
    return null;
  }

  return (
    <SidebarProvider
      className="h-full"
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset className="h-full overflow-hidden">
        <SiteHeader title={headerTitle} />
        <div className="flex flex-1 flex-col overflow-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

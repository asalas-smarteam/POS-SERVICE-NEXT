"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getTenantIdFromClient } from "@/lib/auth/getCurrentTenantId";
import { useAuthStore } from "../../store/authStore";

const SAFE_DEFAULT_PATH = "/home";

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

const withTenantPath = (path, tenantId) => {
  const normalized = normalizePath(path);
  if (!tenantId) {
    return normalized;
  }

  const [_, section] = normalized.split("/");
  if (!["dashboard", "orders", "kitchen", "users", "products", "ingredients", "settings"].includes(section)) {
    return normalized;
  }

  return `/${section}/${tenantId}`;
};

const getFirstAllowedPath = (items = [], tenantId = "") => {
  for (const item of items) {
    if (!item) continue;
    const href = item.href ?? item.url;
    if (href) return withTenantPath(href, tenantId);
    const child = getFirstAllowedPath(Array.isArray(item.items) ? item.items : [], tenantId);
    if (child) return child;
  }
  return SAFE_DEFAULT_PATH;
};

const findNavItemByPath = (items, path, tenantId) => {
  if (!Array.isArray(items)) {
    return null;
  }

  for (const item of items) {
    if (!item) {
      continue;
    }

    const itemPath = withTenantPath(item.href ?? item.url ?? "", tenantId);
    if (itemPath && itemPath === path) {
      return item;
    }

    const children = Array.isArray(item.items) ? item.items : [];
    const childMatch = findNavItemByPath(children, path, tenantId);
    if (childMatch) {
      return childMatch;
    }
  }

  return null;
};

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const hasAccess = useAuthStore((state) => state.hasAccess);
  const navMain = useAuthStore((state) => state.navMain);

  const safeNavMain = useMemo(
    () => (Array.isArray(navMain) ? navMain : []),
    [navMain]
  );

  const normalizedPath = useMemo(() => normalizePath(pathname || SAFE_DEFAULT_PATH), [pathname]);
  const tenantId = useMemo(() => getTenantIdFromClient(normalizedPath) ?? "", [normalizedPath]);

  const firstAllowedPath = useMemo(
    () => getFirstAllowedPath(safeNavMain, tenantId),
    [safeNavMain, tenantId]
  );

  const headerTitle = useMemo(() => {
    const match = findNavItemByPath(safeNavMain, normalizePath(normalizedPath), tenantId);
    return match?.label ?? match?.title ?? "Dashboard";
  }, [normalizedPath, safeNavMain, tenantId]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!hasAccess(normalizedPath)) {
      if (normalizedPath !== firstAllowedPath) {
        router.replace(firstAllowedPath);
      }
    }
  }, [firstAllowedPath, hasHydrated, isAuthenticated, hasAccess, normalizedPath, router]);

  if (!hasHydrated || !isAuthenticated) {
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

"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
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

const findNavItemByPath = (items, path) => {
  if (!Array.isArray(items)) {
    return null;
  }
  for (const item of items) {
    if (!item) {
      continue;
    }
    const itemPath = normalizePath(item.href ?? item.url ?? "");
    if (itemPath && itemPath === path) {
      return item;
    }
    const children = Array.isArray(item.items) ? item.items : [];
    const childMatch = findNavItemByPath(children, path);
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

  const normalizedPath = useMemo(() => {
    if (!pathname) {
      return SAFE_DEFAULT_PATH;
    }
    if (pathname === "/") {
      return "/";
    }
    return pathname.endsWith("/") && pathname !== "/"
      ? pathname.slice(0, -1)
      : pathname;
  }, [pathname]);

  const headerTitle = useMemo(() => {
    const match = findNavItemByPath(safeNavMain, normalizePath(normalizedPath));
    return match?.label ?? match?.title ?? "Dashboard";
  }, [normalizedPath, safeNavMain]);

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    if (!hasAccess(normalizedPath)) {
      if (normalizedPath !== SAFE_DEFAULT_PATH) {
        router.replace(SAFE_DEFAULT_PATH);
      }
    }
  }, [hasHydrated, isAuthenticated, hasAccess, normalizedPath, router]);

  if (!hasHydrated || !isAuthenticated) {
    return null;
  }

  if (!hasAccess(normalizedPath) && normalizedPath !== SAFE_DEFAULT_PATH) {
    return null;
  }

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader title={headerTitle} />
        <div className="flex flex-1 flex-col">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

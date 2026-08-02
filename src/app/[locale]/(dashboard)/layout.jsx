"use client";

import { useEffect, useMemo } from "react";
import { useParams, usePathname } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { getTenantIdFromClient } from "@/lib/auth/getCurrentTenantId";
import { ALL_FEATURE_KEYS } from "@/lib/features/featureRegistry";
import { useAuthStore } from "../../../store/authStore";

const DASHBOARD_SECTION = "dashboard";

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
  const normalizedSection = section === "home" ? DASHBOARD_SECTION : section;

  if (!ALL_FEATURE_KEYS.includes(normalizedSection)) {
    return normalized;
  }

  if (!locale || !tenantId) {
    return normalized;
  }

  if (normalizedSection === DASHBOARD_SECTION) {
    return `/${locale}/dashboard/${tenantId}`;
  }

  return `/${locale}/${normalizedSection}/${tenantId}`;
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
  const pathname = usePathname();
  const params = useParams();
  const hasHydrated = useAuthStore((state) => state.hasHydrated);
  const navMain = useAuthStore((state) => state.navMain);
  const storeTenantId = useAuthStore((state) => state.tenantId);

  const safeNavMain = useMemo(
    () => (Array.isArray(navMain) ? navMain : []),
    [navMain]
  );

  const normalizedPath = useMemo(() => normalizePath(pathname || "/"), [pathname]);
  const locale = useMemo(() => String(params?.locale ?? ""), [params]);
  const tenantIdFromPath = useMemo(() => getTenantIdFromClient(normalizedPath) ?? "", [normalizedPath]);
  const tenantIdFromParams = useMemo(() => String(params?.tenantId ?? ""), [params]);
  const activeTenantId = tenantIdFromPath || tenantIdFromParams;

  // La URL es la sede real (el middleware obliga a que el tenantId de la URL
  // coincida con el del token/cookie). Si el store quedo con una sede vieja de
  // otra sesion, lo reconciliamos con la URL para que el header x-tenant-id y el
  // selector reflejen la sede correcta.
  useEffect(() => {
    if (
      hasHydrated &&
      activeTenantId &&
      String(storeTenantId ?? "") !== String(activeTenantId)
    ) {
      useAuthStore.setState({ tenantId: String(activeTenantId) });
    }
  }, [hasHydrated, activeTenantId, storeTenantId]);

  // Los entitlements viajan dentro del token (7 dias de vida), asi que un
  // cambio de plan no se veria hasta el proximo login. Al montar el dashboard
  // se releen desde la DB y se reemite la cookie.
  useEffect(() => {
    if (!hasHydrated || !activeTenantId) {
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/me/session");
        if (!res.ok) {
          return;
        }
        const data = await res.json();
        if (cancelled) {
          return;
        }
        useAuthStore.setState({
          features: Array.isArray(data.features) ? data.features : [],
          navMain: Array.isArray(data.navMain) ? data.navMain : [],
        });
      } catch {
        // Sin refresco se sigue con lo persistido; el gate del servidor manda.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [hasHydrated, activeTenantId]);

  const headerTitle = useMemo(() => {
    const match = findNavItemByPath(safeNavMain, normalizePath(normalizedPath), activeTenantId, locale);
    return match?.label ?? match?.title ?? "Dashboard";
  }, [normalizedPath, safeNavMain, activeTenantId, locale]);

  if (!hasHydrated) {
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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overflow-x-hidden">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}

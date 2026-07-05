"use client"

import { useMemo } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  IconCashRegister,
  IconChartBar,
  IconChefHat,
  IconHome,
  IconLayoutGrid,
  IconPackage,
  IconReceipt2,
  IconSalt,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const MODULE_ROUTES = ["dashboard", "orders", "active-orders", "kitchen", "users", "products", "ingredients", "settings", "floor"];
const NAV_TRANSLATION_KEYS = {
  dashboard: "dashboard",
  orders: "orders",
  "active-orders": "activeOrders",
  products: "products",
  ingredients: "ingredients",
  kitchen: "kitchen",
  users: "users",
  settings: "settings",
  home: "home",
};

const normalizePath = (value = "") => {
  if (!value) return "/";
  const normalized = value.startsWith("/") ? value : `/${value}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
};

const toTenantHref = (href, locale, tenantId) => {
  const normalized = normalizePath(href);
  if (!locale || !tenantId) return normalized;

  const [, moduleName] = normalized.split("/");
  if (!MODULE_ROUTES.includes(moduleName)) {
    return normalized;
  }

  if (moduleName === "dashboard" || moduleName === "home") {
    return `/${locale}/dashboard/${tenantId}`;
  }

  return `/${locale}/${moduleName}/${tenantId}`;
};

const getNavItemLabel = (item) => {
  const value = String(item?.href ?? item?.url ?? "").toLowerCase();
  const [, moduleName] = normalizePath(value).split("/");
  return NAV_TRANSLATION_KEYS[moduleName];
};

export function NavMain({ items }) {
  const t = useTranslations("Navigation");
  const pathname = usePathname();
  const params = useParams();
  const locale = String(params?.locale ?? "");
  const tenantId = String(params?.tenantId ?? "");

  // Persisted/seeded nav config (DB + localStorage) may contain stale duplicate
  // entries (e.g. two items pointing to /dashboard). Dedupe by destination so a
  // legacy config never renders duplicate React keys.
  const uniqueItems = useMemo(() => {
    const seen = new Set();
    return (Array.isArray(items) ? items : []).filter((item, index) => {
      const identity =
        item?.href ?? item?.url ?? item?.title ?? item?.label ?? `nav-item-${index}`;
      if (seen.has(identity)) {
        return false;
      }
      seen.add(identity);
      return true;
    });
  }, [items]);

  const iconMap = {
    home: IconHome,
    "cash-register": IconCashRegister,
    "receipt-2": IconReceipt2,
    package: IconPackage,
    salt: IconSalt,
    users: IconUsers,
    "chart-bar": IconChartBar,
    "chef-hat": IconChefHat,
    settings: IconSettings,
    "layout-grid": IconLayoutGrid,
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          {uniqueItems.map((item, index) => {
            const ResolvedIcon =
              typeof item.icon === "function"
                ? item.icon
                : typeof item.icon === "string"
                  ? iconMap[item.icon]
                  : null;
            const key =
              item.href ??
              item.url ??
              item.title ??
              item.label ??
              `nav-item-${index}`;
            const href = toTenantHref(item.href ?? item.url ?? "#", locale, tenantId);
            const isActive = normalizePath(pathname) === normalizePath(href);
            const navKey = getNavItemLabel(item);
            const translatedLabel = navKey ? t(navKey) : item.title ?? item.label;

            return (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton asChild tooltip={translatedLabel} isActive={isActive}>
                  <Link href={href}>
                    {ResolvedIcon && <ResolvedIcon />}
                    <span>{translatedLabel}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

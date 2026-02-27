"use client";

import * as React from "react"
import Link from "next/link";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"


const DASHBOARD_SECTIONS = ["dashboard", "orders", "kitchen", "users", "products", "ingredients", "settings"];

const normalizePath = (value = "") => {
  if (!value) return "/";
  const normalized = value.startsWith("/") ? value : `/${value}`;
  return normalized.length > 1 && normalized.endsWith("/")
    ? normalized.slice(0, -1)
    : normalized;
};

const toDashboardHref = (href, locale, tenantId) => {
  const normalized = normalizePath(href);
  if (!locale || !tenantId) return normalized;

  const [, section] = normalized.split("/");
  if (!DASHBOARD_SECTIONS.includes(section)) {
    return normalized;
  }

  if (section === "dashboard" || section === "home") {
    return `/${locale}/dashboard/${tenantId}`;
  }

  return `/${locale}/${section}/${tenantId}`;
};

const TITLE_TO_KEY = {
  dashboard: "dashboard",
  orders: "orders",
  products: "products",
  ingredients: "ingredients",
  kitchen: "kitchen",
  users: "users",
  settings: "settings",
  home: "home",
  profile: "profile",
  logout: "logout",
};

export function NavSecondary({
  items,
  ...props
}) {
  const t = useTranslations("Navigation");
  const params = useParams();
  const locale = String(params?.locale ?? "");
  const tenantId = String(params?.tenantId ?? "");

  return (
    <SidebarGroup {...props}>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const key = TITLE_TO_KEY[String(item.title ?? "").toLowerCase()];
            const label = key ? t(key) : item.title;

            return (
              <SidebarMenuItem key={item.title}>
                <SidebarMenuButton asChild>
                  <Link href={toDashboardHref(item.url, locale, tenantId)}>
                    <item.icon />
                    <span>{label}</span>
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

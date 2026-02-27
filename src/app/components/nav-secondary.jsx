"use client";

import * as React from "react"
import { useTranslations } from "next-intl";

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

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
                  <a href={item.url}>
                    <item.icon />
                    <span>{label}</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

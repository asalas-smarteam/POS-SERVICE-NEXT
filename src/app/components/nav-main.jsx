"use client"

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  IconCashRegister,
  IconChartBar,
  IconChefHat,
  IconCirclePlusFilled,
  IconHome,
  IconMail,
  IconPackage,
  IconReceipt2,
  IconSalt,
  IconSettings,
  IconUsers,
} from "@tabler/icons-react";

import { getTenantIdFromClient } from "@/lib/auth/getCurrentTenantId";
import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const MODULE_ROUTES = ["dashboard", "orders", "kitchen", "users", "products", "ingredients", "settings"];

const normalizePath = (value = "") => {
  if (!value) return "/";
  const normalized = value.startsWith("/") ? value : `/${value}`;
  if (normalized.length > 1 && normalized.endsWith("/")) {
    return normalized.slice(0, -1);
  }
  return normalized;
};

const toTenantHref = (href, tenantId) => {
  const normalized = normalizePath(href);
  if (!tenantId) return normalized;

  const [_, moduleName] = normalized.split("/");
  if (!MODULE_ROUTES.includes(moduleName)) {
    return normalized;
  }

  const [, root, currentTenant, ...rest] = normalized.split("/");
  if (currentTenant && currentTenant === tenantId) {
    return normalized;
  }

  if (currentTenant && !rest.length) {
    return `/${root}/${tenantId}`;
  }

  if (currentTenant && MODULE_ROUTES.includes(currentTenant)) {
    return `/${root}/${tenantId}/${[currentTenant, ...rest].join("/")}`;
  }

  return `/${moduleName}/${tenantId}`;
};

export function NavMain({ items }) {
  const pathname = usePathname();
  const tenantId = getTenantIdFromClient(pathname);

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
  };

  return (
    <SidebarGroup>
      <SidebarGroupContent className="flex flex-col gap-2">
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-2">
            <SidebarMenuButton
              tooltip="Quick Create"
              className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear">
              <IconCirclePlusFilled />
              <span>Quick Create</span>
            </SidebarMenuButton>
            <Button
              size="icon"
              className="size-8 group-data-[collapsible=icon]:opacity-0"
              variant="outline">
              <IconMail />
              <span className="sr-only">Inbox</span>
            </Button>
          </SidebarMenuItem>
        </SidebarMenu>
        <SidebarMenu>
          {items.map((item, index) => {
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
            const href = toTenantHref(item.href ?? item.url ?? "#", tenantId);
            const isActive = normalizePath(pathname) === normalizePath(href);
            return (
              <SidebarMenuItem key={key}>
                <SidebarMenuButton asChild tooltip={item.title ?? item.label} isActive={isActive}>
                  <Link href={href}>
                    {ResolvedIcon && <ResolvedIcon />}
                    <span>{item.title ?? item.label}</span>
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

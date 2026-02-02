"use client"

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

import { Button } from "@/components/ui/button"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({ items }) {
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
            return (
              <SidebarMenuItem key={key}>
              <SidebarMenuButton tooltip={item.title ?? item.label}>
                {ResolvedIcon && <ResolvedIcon />}
                <span>{item.title ?? item.label}</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

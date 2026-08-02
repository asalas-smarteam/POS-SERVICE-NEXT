"use client"

import { useTranslations } from "next-intl";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { LanguageSwitcher } from "@/components/language-switcher";
import { SedeSwitcher } from "@/components/sede-switcher";

const TITLE_TO_KEY = {
  dashboard: "dashboard",
  orders: "orders",
  "active orders": "activeOrders",
  products: "products",
  ingredients: "ingredients",
  kitchen: "kitchen",
  users: "users",
  settings: "settings",
  home: "home",
};

export function SiteHeader({ title = "Dashboard" }) {
  const t = useTranslations("Navigation");
  const normalizedTitle = String(title ?? "").toLowerCase();
  const titleKey = TITLE_TO_KEY[normalizedTitle];

  return (
    <header
      className="flex h-(--header-height) shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height)"
    >
      <div className="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mx-2 data-[orientation=vertical]:h-4" />
        <h1 className="text-base font-medium">{titleKey ? t(titleKey) : title}</h1>
        <div className="ml-auto flex items-center gap-2">
          <SedeSwitcher />
          <LanguageSwitcher />
        </div>
      </div>
    </header>
  );
}

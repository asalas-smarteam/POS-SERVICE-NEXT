"use client"

import * as React from "react"
import { IconInnerShadowTop } from "@tabler/icons-react"
import { X } from "lucide-react"
import { useTranslations } from "next-intl"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { ThemeToggle } from "@/components/theme-toggle"
import { Button } from "@/components/ui/button"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { useAuthStore } from "../../store/authStore"

export function AppSidebar({
  ...props
}) {
  const t = useTranslations("Navigation")
  const tCommon = useTranslations("Common")
  const { isMobile, setOpenMobile } = useSidebar()
  const user = useAuthStore((state) => state.user)
  const tenant = useAuthStore((state) => state.tenant)
  const navMain = useAuthStore((state) => state.navMain)
  const companyName = tenant?.name || "POS"
  const safeNavMain = Array.isArray(navMain) ? navMain : []
  const safeUser = user ?? {
    name: "Usuario",
    email: "",
    avatar: "/avatars/shadcn.jpg",
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem className="flex items-center gap-1">
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">{companyName}</span>
              </a>
            </SidebarMenuButton>
            {/* A pantalla completa el menu movil tapa todo: sin overlay visible
                para tocar, necesita su propio boton de cierre. */}
            {isMobile ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label={tCommon("close")}
                onClick={() => setOpenMobile(false)}
              >
                <X className="size-5" />
              </Button>
            ) : null}
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {safeNavMain.length > 0 ? (
          <NavMain items={safeNavMain} />
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            {t("noAccessAssigned")}
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <div className="px-2 pb-1">
          <ThemeToggle className="w-full justify-start" />
        </div>
        <NavUser user={safeUser} />
      </SidebarFooter>
    </Sidebar>
  );
}

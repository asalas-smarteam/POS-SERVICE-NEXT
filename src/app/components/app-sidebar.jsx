"use client"

import * as React from "react"
import { IconInnerShadowTop } from "@tabler/icons-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { useAuthStore } from "../../store/authStore"

export function AppSidebar({
  ...props
}) {
  const user = useAuthStore((state) => state.user)
  const navMain = useAuthStore((state) => state.navMain)
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
          <SidebarMenuItem>
            <SidebarMenuButton asChild className="data-[slot=sidebar-menu-button]:!p-1.5">
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Acme Inc.</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        {safeNavMain.length > 0 ? (
          <NavMain items={safeNavMain} />
        ) : (
          <div className="px-3 py-2 text-sm text-muted-foreground">
            Sin accesos asignados.
          </div>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={safeUser} />
      </SidebarFooter>
    </Sidebar>
  );
}

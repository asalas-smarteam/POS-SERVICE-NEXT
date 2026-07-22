"use client";

import { Bell, Search, Settings } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "../../../store/authStore";

export function SalesHeader({ searchTerm, onSearchChange }) {
  const t = useTranslations("Orders");
  const operatorName = useAuthStore((state) => state.user?.name);

  return (
    <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
      <div>
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        {operatorName ? (
          <p className="text-xs text-muted-foreground">{operatorName}</p>
        ) : null}
      </div>
      <div className="flex w-full flex-col gap-3 md:w-auto md:flex-row md:items-center">
        <div className="relative w-full md:w-[320px] lg:w-[360px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("searchProducts")}
            value={searchTerm}
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label={t("settings")}>
            <Settings className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" aria-label={t("notifications")}>
            <Bell className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

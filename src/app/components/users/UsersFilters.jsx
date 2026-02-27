"use client";

import { Search, SlidersHorizontal } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function UsersFilters({ search, status, onSearchChange, onStatusChange }) {
  const t = useTranslations("Users");

  const FILTERS = [
    { label: t("all"), value: "all" },
    { label: t("active"), value: "active" },
    { label: t("inactive"), value: "inactive" },
  ];

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-[#0c1f30] md:flex-row md:items-center">
      <div className="relative flex-1">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400 dark:text-slate-500" />
        <Input
          className="h-10 border-0 bg-slate-100 pl-10 text-sm text-slate-700 placeholder:text-slate-400 focus-visible:ring-[#137fec]/20 dark:bg-[#152c42] dark:text-slate-100 dark:placeholder:text-slate-400"
          placeholder={t("searchPlaceholder")}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
        />
      </div>

      <div className="flex w-full items-center rounded-lg bg-slate-100 p-1 dark:bg-[#152c42] md:w-auto">
        {FILTERS.map((item) => {
          const active = status === item.value;
          return (
            <button
              key={item.value}
              className={`flex-1 rounded-md px-4 py-1.5 text-sm font-medium transition-colors md:flex-none ${active ? "bg-white text-[#137fec] shadow-sm dark:bg-[#0f2538] dark:text-sky-300" : "text-slate-500 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-100"}`}
              onClick={() => onStatusChange(item.value)}
              type="button"
            >
              {item.label}
            </button>
          );
        })}
      </div>

      <Button className="h-10 w-full gap-2 border-slate-200 text-slate-600 dark:border-slate-700 dark:bg-[#0f2538] dark:text-slate-200 dark:hover:bg-[#163049] md:w-auto" variant="outline" type="button">
        <SlidersHorizontal className="size-4" />
        {t("filters")}
      </Button>
    </div>
  );
}

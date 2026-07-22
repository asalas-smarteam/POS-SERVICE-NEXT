"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function SizeTabs({ sizes = [], activeSize, onSelect }) {
  const t = useTranslations("Orders");

  if (!sizes.length) {
    return null;
  }

  const tabs = [
    { id: "all", label: t("allSizes") },
    ...sizes.map((size) => ({
      id: size.id,
      label: size.label ?? size.id,
    })),
  ];

  return (
    <ScrollArea className="w-full">
      <div className="flex w-max gap-2 pb-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeSize;
          return (
            <Badge
              key={tab.id}
              asChild
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer px-4 py-2 text-sm font-semibold transition",
                isActive ? "shadow-sm" : "hover:bg-accent"
              )}
            >
              <button type="button" onClick={() => onSelect(tab.id)}>
                {tab.label}
              </button>
            </Badge>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}

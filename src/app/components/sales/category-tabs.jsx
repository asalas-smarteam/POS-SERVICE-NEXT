"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function CategoryTabs({ categories = [], activeCategory, onSelect }) {
  const t = useTranslations("Orders");
  const defaultCategories = [{ id: "all", label: t("allItems") }];
  const tabs = [
    ...defaultCategories,
    ...categories.map((category) => ({
      id: category.id,
      label: category.label ?? category.id,
    })),
  ];

  return (
    <ScrollArea className="w-full">
      <div className="flex w-max gap-2 pb-2">
        {tabs.map((tab) => {
          const isActive = tab.id === activeCategory;
          return (
            <Badge
              key={tab.id}
              asChild
              variant={isActive ? "default" : "outline"}
              className={cn(
                "cursor-pointer select-none px-4 py-2 text-sm font-semibold transition active:scale-95",
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

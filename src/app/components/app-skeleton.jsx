"use client";

import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const variants = {
  grid: {
    wrapper: "grid gap-4 sm:grid-cols-2 xl:grid-cols-3",
    item: "h-40",
  },
  table: {
    wrapper: "space-y-3",
    item: "h-10",
  },
  list: {
    wrapper: "space-y-3",
    item: "h-16",
  },
};

export function AppSkeleton({ variant = "grid", count = 6, className }) {
  const config = variants[variant] ?? variants.grid;

  return (
    <div className={cn(config.wrapper, className)}>
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={`skeleton-${variant}-${index}`} className={config.item} />
      ))}
    </div>
  );
}

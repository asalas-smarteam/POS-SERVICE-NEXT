"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function UsersPagination({ page, totalPages, total, start, end, onPageChange }) {
  const t = useTranslations("Users");
  const pages = [];
  const from = Math.max(1, page - 1);
  const to = Math.min(totalPages, page + 1);
  for (let index = from; index <= to; index += 1) pages.push(index);

  return (
    <div className="flex flex-col items-start justify-between gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4 dark:border-slate-800 dark:bg-[#0f2538] md:flex-row md:items-center">
      <span className="text-xs text-slate-500 dark:text-slate-300">{t("showingResults", { start, end, total })}</span>

      <div className="flex items-center gap-1">
        <Button disabled={page <= 1} onClick={() => onPageChange(page - 1)} size="icon" variant="outline">
          <ChevronLeft className="size-4" />
        </Button>
        {pages.map((pageNumber) => (
          <Button
            key={pageNumber}
            className={pageNumber === page ? "bg-[#137fec] text-white hover:bg-[#137fec]/90" : ""}
            onClick={() => onPageChange(pageNumber)}
            size="icon"
            variant={pageNumber === page ? "default" : "outline"}
          >
            {pageNumber}
          </Button>
        ))}
        <Button disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} size="icon" variant="outline">
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

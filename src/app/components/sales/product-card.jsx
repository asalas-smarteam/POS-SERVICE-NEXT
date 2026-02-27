"use client";

import { Coffee } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { useLongPress } from "@/hooks/useLongPress";
import { cn } from "@/lib/utils";

const formatCurrency = (value, locale) =>
  new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "CLP",
  }).format(Number(value ?? 0));

export function ProductCard({ product, onSelect, onLongSelect }) {
  const t = useTranslations("Orders");
  const locale = useLocale();
  const longPressBindings = useLongPress({
    onLongPress: () => onLongSelect?.(product),
    onClick: () => onSelect?.(product),
    delay: 500,
  });

  return (
    <Card
      className={cn(
        "group cursor-pointer border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      )}
      {...longPressBindings}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex h-28 items-center justify-center rounded-xl bg-muted/60">
          <Coffee className="size-10 text-muted-foreground" />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground">
            {product?.name ?? t("unknownProduct")}
          </p>
          <p className="text-sm font-bold text-primary">
            {formatCurrency(product?.price, locale)}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

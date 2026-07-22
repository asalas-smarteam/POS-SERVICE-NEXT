"use client";

import { Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLongPress } from "@/hooks/useLongPress";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "../../../store/settingsStore";

export function ProductCard({ product, onSelect, onLongSelect }) {
  const t = useTranslations("Orders");
  const { formatCurrency } = useCurrencyFormatter();
  const sizeLookup = useSettingsStore((state) => state.sizeLookup);
  const sizeLabel = product?.productSizeId ? sizeLookup[product.productSizeId] : null;
  const longPressBindings = useLongPress({
    onLongPress: () => onLongSelect?.(product),
    onClick: () => onSelect?.(product),
    delay: 500,
  });

  return (
    <Card
      className={cn(
        "group touch-pan-y cursor-pointer select-none border bg-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
      )}
      {...longPressBindings}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex h-28 items-center justify-center rounded-xl bg-muted/60">
          <Coffee className="size-10 text-muted-foreground" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              {product?.name ?? t("unknownProduct")}
            </p>
            {sizeLabel ? (
              <Badge variant="secondary" className="text-[10px]">
                {sizeLabel}
              </Badge>
            ) : null}
          </div>
          <p className="text-sm font-bold text-primary">{formatCurrency(product?.price)}</p>
        </div>
      </CardContent>
    </Card>
  );
}

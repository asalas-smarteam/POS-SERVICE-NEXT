"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Check, Coffee } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useLongPress } from "@/hooks/useLongPress";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";
import { cn } from "@/lib/utils";
import { useSettingsStore } from "../../../store/settingsStore";

// El tap no navega ni abre nada, asi que sin este destello el cajero no sabe si
// el producto entro a la orden (sobre todo en movil, donde no hay :hover).
const FEEDBACK_DURATION = 320;

export function ProductCard({ product, onSelect, onLongSelect }) {
  const t = useTranslations("Orders");
  const { formatCurrency } = useCurrencyFormatter();
  const sizeLookup = useSettingsStore((state) => state.sizeLookup);
  const sizeLabel = product?.productSizeId ? sizeLookup[product.productSizeId] : null;
  const [justAdded, setJustAdded] = useState(false);
  const feedbackTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(feedbackTimerRef.current), []);

  const flashFeedback = useCallback(() => {
    clearTimeout(feedbackTimerRef.current);
    setJustAdded(true);
    feedbackTimerRef.current = setTimeout(() => setJustAdded(false), FEEDBACK_DURATION);
  }, []);

  const longPressBindings = useLongPress({
    onLongPress: () => {
      flashFeedback();
      onLongSelect?.(product);
    },
    onClick: () => {
      flashFeedback();
      onSelect?.(product);
    },
    delay: 500,
  });

  return (
    <Card
      className={cn(
        "group relative touch-pan-y cursor-pointer select-none border bg-card transition duration-150",
        "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
        "active:scale-[0.97] active:border-primary active:bg-accent/60 active:shadow-inner",
        justAdded &&
          "-translate-y-0.5 border-primary bg-accent/40 shadow-lg ring-2 ring-primary/50"
      )}
      {...longPressBindings}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="relative flex h-28 items-center justify-center rounded-xl bg-muted/60">
          <Coffee className="size-10 text-muted-foreground" />
          <span
            aria-hidden="true"
            className={cn(
              "absolute inset-0 flex items-center justify-center rounded-xl bg-primary/15 transition-opacity duration-150",
              justAdded ? "opacity-100" : "opacity-0"
            )}
          >
            <span className="flex size-9 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm">
              <Check className="size-5" />
            </span>
          </span>
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

"use client";

import { useEffect } from "react";
import { ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

// A partir de lg el panel de la orden ya se ve fijo al lado del catalogo, asi
// que el drawer solo tiene sentido por debajo de ese ancho.
const DESKTOP_QUERY = "(min-width: 1024px)";

// En movil la orden actual quedaba al final del scroll de productos: para
// cobrar habia que recorrer todo el catalogo. Aqui la barra vive fija arriba y
// el panel entra como drawer por la derecha (el de navegacion entra por la
// izquierda).
export function OrderDetailTrigger({ itemCount = 0, total = 0, onOpen, className = "" }) {
  const t = useTranslations("Orders");
  const { formatCurrency } = useCurrencyFormatter();

  return (
    <div
      className={`sticky top-0 z-30 -mx-4 -mt-6 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden ${className}`.trim()}
    >
      <Button
        type="button"
        className="h-11 w-full justify-between active:scale-[0.99]"
        onClick={onOpen}
      >
        <span className="flex items-center gap-2">
          <ReceiptText className="size-4" />
          {t("openOrderDetail")}
          {itemCount ? (
            <Badge
              variant="secondary"
              className="min-w-6 justify-center px-1.5 text-[11px] font-bold"
            >
              {itemCount}
            </Badge>
          ) : null}
        </span>
        <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
      </Button>
    </div>
  );
}

export function OrderDetailDrawer({ open, onOpenChange, children }) {
  const t = useTranslations("Orders");

  // Al pasar a escritorio (rotar la tablet, redimensionar) el panel fijo vuelve
  // a estar visible; dejar el drawer abierto solo mantendria el foco atrapado.
  useEffect(() => {
    if (!open) {
      return;
    }
    const media = window.matchMedia(DESKTOP_QUERY);
    if (media.matches) {
      onOpenChange?.(false);
      return;
    }
    const handleChange = (event) => {
      if (event.matches) {
        onOpenChange?.(false);
      }
    };
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [open, onOpenChange]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-full max-w-full gap-0 p-0 sm:max-w-md"
      >
        <SheetHeader className="sr-only">
          <SheetTitle>{t("currentOrder")}</SheetTitle>
          <SheetDescription>{t("openOrderDetail")}</SheetDescription>
        </SheetHeader>
        {children}
      </SheetContent>
    </Sheet>
  );
}

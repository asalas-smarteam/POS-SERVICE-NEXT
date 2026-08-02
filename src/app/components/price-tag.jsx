"use client";

import { cn } from "@/lib/utils";

export const formatPrice = (amount) => {
  const value = Number(amount) || 0;
  // Los planes se cotizan en dolares redondos; los centavos solo aparecen
  // cuando un descuento porcentual los produce.
  return Number.isInteger(value) ? `$${value}` : `$${value.toFixed(2)}`;
};

/**
 * Precio con descuento visible: el original tachado y el final al lado.
 * Sin promocion vigente ambos coinciden y solo se pinta un numero.
 */
export function PriceTag({ original, final, suffix = "", className, emphasis = false }) {
  const originalAmount = Number(original) || 0;
  const finalAmount = Number(final ?? original) || 0;
  const hasDiscount = finalAmount < originalAmount;

  return (
    <span className={cn("inline-flex items-baseline gap-2", className)}>
      {hasDiscount ? (
        <span className="text-sm text-slate-400 line-through">
          {formatPrice(originalAmount)}
        </span>
      ) : null}
      <span className={cn(emphasis && "text-blue-500", hasDiscount && "font-semibold")}>
        {formatPrice(finalAmount)}
        {suffix}
      </span>
    </span>
  );
}

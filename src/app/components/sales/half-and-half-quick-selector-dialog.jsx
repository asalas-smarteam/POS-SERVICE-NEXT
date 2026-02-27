"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function HalfAndHalfQuickSelectorDialog({
  open,
  onOpenChange,
  baseProduct,
  compatibleProducts = [],
  onConfirm,
}) {
  const t = useTranslations("Orders");
  const [selectedProductId, setSelectedProductId] = useState("");

  const selectedProduct = useMemo(
    () => compatibleProducts.find((product) => (product?._id ?? product?.id) === selectedProductId),
    [compatibleProducts, selectedProductId]
  );

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setSelectedProductId("");
    }
    onOpenChange?.(nextOpen);
  };

  const handleConfirm = () => {
    if (!selectedProduct) {
      return;
    }
    onConfirm?.(selectedProduct);
    setSelectedProductId("");
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("halfAndHalf")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            {t("selectSecondHalf", { product: baseProduct?.name ?? t("product") })}
          </p>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger>
              <SelectValue placeholder={t("chooseCompatibleProduct")} />
            </SelectTrigger>
            <SelectContent>
              {compatibleProducts.map((product) => {
                const value = product?._id ?? product?.id;
                return (
                  <SelectItem key={value} value={value}>
                    {product?.name ?? t("unknownProduct")}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedProduct}>
            {t("addHalfAndHalf")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

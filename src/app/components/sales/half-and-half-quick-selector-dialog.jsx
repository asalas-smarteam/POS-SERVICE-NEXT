"use client";

import { useMemo, useState } from "react";
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
          <DialogTitle>Half and Half</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Select the second half for <span className="font-medium text-foreground">{baseProduct?.name ?? "product"}</span>.
          </p>
          <Select value={selectedProductId} onValueChange={setSelectedProductId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a compatible product" />
            </SelectTrigger>
            <SelectContent>
              {compatibleProducts.map((product) => {
                const value = product?._id ?? product?.id;
                return (
                  <SelectItem key={value} value={value}>
                    {product?.name ?? "Product"}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!selectedProduct}>
            Add half and half
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

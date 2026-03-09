"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function OrderCheckoutDialog({
  open,
  onOpenChange,
  orderTypes = [],
  tables = [],
  isSubmitting = false,
  defaultCustomerName = "",
  defaultOrderType = "",
  defaultTableId = "",
  onConfirm,
}) {
  const t = useTranslations("Orders");
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [orderType, setOrderType] = useState(defaultOrderType);
  const [tableId, setTableId] = useState(defaultTableId);
  const [formError, setFormError] = useState("");

  const selectedOrderType = useMemo(
    () => orderTypes.find((type) => type.id === orderType) || null,
    [orderTypes, orderType]
  );
  const requiresTable = selectedOrderType?.id === "onTable";

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setCustomerName(defaultCustomerName || "");
      setOrderType(defaultOrderType || orderTypes[0]?.id || "");
      setTableId(defaultTableId || "");
      setFormError("");
    }
    onOpenChange?.(nextOpen);
  };

  const handleSubmit = () => {
    const normalizedCustomerName = customerName.trim();
    if (!normalizedCustomerName) {
      setFormError(t("customerRequired"));
      return;
    }
    if (!orderType) {
      setFormError(t("orderTypeRequired"));
      return;
    }
    if (requiresTable && !tableId) {
      setFormError(t("tableRequired"));
      return;
    }

    const selectedTable = tables.find((table) => table.id === tableId);
    onConfirm?.({
      customerName: normalizedCustomerName,
      orderType,
      tableId: requiresTable ? tableId : null,
      tableLabel: requiresTable ? selectedTable?.name || null : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("orderCheckoutDialogTitle")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="checkout-customer-name">{t("customerName")}</Label>
            <Input
              id="checkout-customer-name"
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
              placeholder={t("customerName")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="checkout-order-type">{t("orderType")}</Label>
            <Select value={orderType} onValueChange={setOrderType}>
              <SelectTrigger id="checkout-order-type">
                <SelectValue placeholder={t("orderTypePlaceholder")} />
              </SelectTrigger>
              <SelectContent>
                {orderTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {requiresTable ? (
            <div className="space-y-2">
              <Label htmlFor="checkout-table">{t("table")}</Label>
              <Select value={tableId} onValueChange={setTableId}>
                <SelectTrigger id="checkout-table">
                  <SelectValue placeholder={t("tablePlaceholder")} />
                </SelectTrigger>
                <SelectContent>
                  {tables.map((table) => (
                    <SelectItem key={table.id} value={table.id}>
                      {table.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button type="button" onClick={handleSubmit} disabled={isSubmitting}>
            {t("checkout")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

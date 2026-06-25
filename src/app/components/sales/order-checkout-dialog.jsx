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
  lockOrderTypeAndTable = false,
  onConfirm,
}) {
  const t = useTranslations("Orders");
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [orderType, setOrderType] = useState(defaultOrderType);
  const [tableId, setTableId] = useState(defaultTableId);
  const [formError, setFormError] = useState("");
  const [wasOpen, setWasOpen] = useState(open);

  // Sync the form with the current defaults each time the dialog opens, so a
  // table flow (e.g. ?orderType=onTable&tableId=...) preselects the order type
  // and table even though the parent sets them after the first render.
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setCustomerName(defaultCustomerName || "");
      setOrderType(defaultOrderType || orderTypes[0]?.id || "");
      setTableId(defaultTableId || "");
      setFormError("");
    }
  }

  const selectedOrderType = useMemo(
    () => orderTypes.find((type) => type.id === orderType) || null,
    [orderTypes, orderType]
  );
  const requiresTable = selectedOrderType?.id === "onTable";
  const selectedTable = useMemo(
    () => tables.find((table) => table.id === tableId) || null,
    [tables, tableId]
  );

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

    // When finalizing an existing order the fields are prefilled and read-only,
    // so we skip the create-time validations and only keep the table rule for
    // orders that are actually served on a table.
    if (!lockOrderTypeAndTable) {
      if (!normalizedCustomerName) {
        setFormError(t("customerRequired"));
        return;
      }
      if (!orderType) {
        setFormError(t("orderTypeRequired"));
        return;
      }
    }

    if (requiresTable && !tableId) {
      setFormError(t("tableRequired"));
      return;
    }

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
              readOnly={lockOrderTypeAndTable}
              disabled={lockOrderTypeAndTable}
            />
          </div>

          {lockOrderTypeAndTable ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="checkout-order-type-readonly">{t("orderType")}</Label>
                <Input
                  id="checkout-order-type-readonly"
                  value={selectedOrderType?.label || orderType || "-"}
                  readOnly
                  disabled
                />
              </div>

              {requiresTable ? (
                <div className="space-y-2">
                  <Label htmlFor="checkout-table-readonly">{t("table")}</Label>
                  <Input
                    id="checkout-table-readonly"
                    value={selectedTable?.name || tableId || t("notAssigned")}
                    readOnly
                    disabled
                  />
                </div>
              ) : null}
            </>
          ) : (
            <>
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
            </>
          )}

          {formError ? <p className="text-sm text-destructive">{formError}</p> : null}
        </div>

        <DialogFooter className="gap-2">
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

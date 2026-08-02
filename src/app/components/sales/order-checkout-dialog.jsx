"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useFeature } from "@/components/feature-gate";

export function OrderCheckoutDialog({
  open,
  onOpenChange,
  orderTypes = [],
  tables = [],
  isSubmitting = false,
  defaultCustomerName = "",
  defaultOrderType = "",
  defaultTableId = "",
  defaultTableLabel = "",
  lockOrderTypeAndTable = false,
  kitchenItemCount = 0,
  onConfirm,
}) {
  const t = useTranslations("Orders");
  // Sin el plano de mesas contratado la orden igual puede ser "en mesa": en vez
  // de elegir una mesa del plano, el cajero escribe una etiqueta libre.
  const hasFloor = useFeature("floor");
  const hasKitchen = useFeature("kitchen");
  const [customerName, setCustomerName] = useState(defaultCustomerName);
  const [orderType, setOrderType] = useState(defaultOrderType);
  const [tableId, setTableId] = useState(defaultTableId);
  const [tableLabel, setTableLabel] = useState(defaultTableLabel);
  const [sendToKitchen, setSendToKitchen] = useState(true);
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
      setTableLabel(defaultTableLabel || "");
      setSendToKitchen(true);
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
  // El override del cajero solo tiene sentido si hay cocina contratada y algo
  // del carrito requiere preparacion.
  const showKitchenToggle = hasKitchen && kitchenItemCount > 0;

  const handleOpenChange = (nextOpen) => {
    if (!nextOpen) {
      setCustomerName(defaultCustomerName || "");
      setOrderType(defaultOrderType || orderTypes[0]?.id || "");
      setTableId(defaultTableId || "");
      setTableLabel(defaultTableLabel || "");
      setSendToKitchen(true);
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

    const normalizedTableLabel = tableLabel.trim();

    if (requiresTable) {
      if (hasFloor && !tableId) {
        setFormError(t("tableRequired"));
        return;
      }
      if (!hasFloor && !normalizedTableLabel) {
        setFormError(t("tableLabelRequired"));
        return;
      }
    }

    onConfirm?.({
      customerName: normalizedCustomerName,
      orderType,
      // Sin plano de mesas la orden no referencia ninguna fila de Table: viaja
      // solo con la etiqueta, y por eso no hay estado de mesa que actualizar.
      tableId: requiresTable && hasFloor ? tableId : null,
      tableLabel: requiresTable
        ? hasFloor
          ? selectedTable?.name || null
          : normalizedTableLabel
        : null,
      sendToKitchen: showKitchenToggle ? sendToKitchen : false,
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
                    value={
                      selectedTable?.name || tableLabel || tableId || t("notAssigned")
                    }
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
                hasFloor ? (
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
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="checkout-table-label">{t("tableLabel")}</Label>
                    <Input
                      id="checkout-table-label"
                      value={tableLabel}
                      onChange={(event) => setTableLabel(event.target.value)}
                      placeholder={t("tableLabelPlaceholder")}
                    />
                    <p className="text-xs text-muted-foreground">
                      {t("tableLabelHint")}
                    </p>
                  </div>
                )
              ) : null}
            </>
          )}

          {/* Override del cajero. Solo aparece si algo del carrito requiere
              preparacion: una orden de solo bebidas nunca va a cocina. */}
          {showKitchenToggle ? (
            <div className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3">
              <Checkbox
                id="checkout-send-to-kitchen"
                checked={sendToKitchen}
                onCheckedChange={(checked) => setSendToKitchen(Boolean(checked))}
                className="mt-0.5"
              />
              <div className="space-y-0.5">
                <Label htmlFor="checkout-send-to-kitchen">{t("sendToKitchen")}</Label>
                <p className="text-xs text-muted-foreground">
                  {t("sendToKitchenHint", { count: kitchenItemCount })}
                </p>
              </div>
            </div>
          ) : null}

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

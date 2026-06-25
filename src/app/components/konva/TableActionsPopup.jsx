"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

function getStatusVariant(status) {
  if (status === "occupied") {
    return "destructive";
  }
  if (status === "reserved") {
    return "secondary";
  }
  return "default";
}

export function TableActionsPopup({
  table,
  activeOrder,
  loadingActiveOrder,
  onOpenChange,
  onCreateOrder,
  onReserveTable,
  onRemoveReservation,
  onManagePayment,
  onCloseOrder,
}) {
  const t = useTranslations("Floor");
  const isMobile = useIsMobile();
  const open = Boolean(table?.id);

  const summaryItems = Array.isArray(activeOrder?.items) ? activeOrder.items.slice(0, 6) : [];

  const content = (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm text-muted-foreground">{t("selectedTable")}</p>
        <div className="flex items-center justify-between rounded-md border p-3">
          <p className="font-medium">{table?.name || "-"}</p>
          <Badge variant={getStatusVariant(table?.status)}>{t(`status.${table?.status || "available"}`)}</Badge>
        </div>
      </div>

      {(table?.status === "available" || table?.status === "reserved") && (
        <div className="grid gap-2">
          <Button onClick={onCreateOrder}>{t("actions.createOrder")}</Button>
          {table?.status === "available" ? (
            <Button variant="outline" onClick={onReserveTable}>{t("actions.reserveTable")}</Button>
          ) : (
            <Button variant="outline" onClick={onRemoveReservation}>{t("actions.removeReservation")}</Button>
          )}
        </div>
      )}

      {table?.status === "occupied" && (
        <div className="space-y-3">
          <div className="space-y-1 rounded-md border p-3 text-sm">
            <p className="font-medium">{t("activeOrderSummary")}</p>
            <p className="text-muted-foreground">
              {loadingActiveOrder
                ? t("loading")
                : activeOrder
                  ? `${t("orderStatus")}: ${activeOrder.status || "-"}`
                  : t("noActiveOrder")}
            </p>
          </div>

          {summaryItems.length > 0 && (
            <div className="rounded-md border p-3">
              <p className="mb-2 text-sm font-medium">{t("products")}</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {summaryItems.map((item, index) => (
                  <li key={`${item.productName || "item"}-${index}`}>
                    {item.quantity}x {item.productName || t("unnamedProduct")}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-2">
            <Button onClick={onManagePayment} disabled={!activeOrder?._id || loadingActiveOrder}>
              {t("actions.managePayment")}
            </Button>
            <Button variant="outline" onClick={onCloseOrder} disabled={!activeOrder?._id || loadingActiveOrder}>
              {t("actions.closeOrder")}
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange} direction="bottom">
        <DrawerContent className="mx-auto max-w-md rounded-t-xl">
          <DrawerHeader>
            <DrawerTitle>{t("tableActions")}</DrawerTitle>
            <DrawerDescription>{t("tableActionsDescription")}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-4">{content}</div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tableActions")}</DialogTitle>
          <DialogDescription>{t("tableActionsDescription")}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}

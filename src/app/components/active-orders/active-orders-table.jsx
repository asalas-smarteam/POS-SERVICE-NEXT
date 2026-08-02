"use client";

import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useFeature } from "@/components/feature-gate";

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });

export function ActiveOrdersTable({ orders, onAction }) {
  const t = useTranslations("ActiveOrders");
  // A diferencia del badge, la columna se renderiza siempre; sin cocina
  // contratada quedaria una columna entera de guiones.
  const hasKitchen = useFeature("kitchen");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("customer")}</TableHead>
          <TableHead>{t("orderType")}</TableHead>
          {hasKitchen ? <TableHead>{t("kitchenStatusLabel")}</TableHead> : null}
          <TableHead>{t("products")}</TableHead>
          <TableHead>{t("amount")}</TableHead>
          <TableHead className="text-right">{t("actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order._id ?? order.id}>
            <TableCell className="font-medium">{order.customerTitle}</TableCell>
            <TableCell>
              <Badge className={order.orderTypeBadgeClass}>{order.orderTypeLabel}</Badge>
            </TableCell>
            {hasKitchen ? (
              <TableCell>
                {order.kitchenStatusLabel ? (
                  <Badge className={order.kitchenStatusBadgeClass}>{order.kitchenStatusLabel}</Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">—</span>
                )}
              </TableCell>
            ) : null}
            <TableCell>
              <Badge className={order.orderTypeBadgeClass}>
                {t("productsCount", { count: order.productsCount })}
              </Badge>
            </TableCell>
            <TableCell>
              <div className="flex flex-col">
                <span>{formatAmount(order.amount)}</span>
                {order.paymentStatus === "partial" ? (
                  <span className="text-xs text-amber-600 dark:text-amber-400">
                    {t("remaining")}: {formatAmount(order.amountDue)}
                  </span>
                ) : order.paymentStatus === "paid" ? (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400">
                    {t("paidFull")}
                  </span>
                ) : null}
              </div>
            </TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => onAction?.(order)}>
                {t("rowAction")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

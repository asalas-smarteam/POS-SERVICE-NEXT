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

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });

export function ActiveOrdersTable({ orders, onAction }) {
  const t = useTranslations("ActiveOrders");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("customer")}</TableHead>
          <TableHead>{t("orderType")}</TableHead>
          <TableHead>{t("kitchenStatusLabel")}</TableHead>
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
            <TableCell>
              {order.kitchenStatusLabel ? (
                <Badge className={order.kitchenStatusBadgeClass}>{order.kitchenStatusLabel}</Badge>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell>
              <Badge className={order.orderTypeBadgeClass}>
                {t("productsCount", { count: order.productsCount })}
              </Badge>
            </TableCell>
            <TableCell>{formatAmount(order.amount)}</TableCell>
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

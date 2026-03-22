"use client";

import { ReceiptText } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formatAmount = (amount) =>
  Number(amount || 0).toLocaleString("es-CR", {
    style: "currency",
    currency: "CRC",
    maximumFractionDigits: 0,
  });

export function ActiveOrderCard({ order, onAction }) {
  const t = useTranslations("ActiveOrders");

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ReceiptText className="size-4 text-muted-foreground" />
          {order?.customerTitle}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <Badge className={order?.orderTypeBadgeClass}>{order?.orderTypeLabel}</Badge>
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("amount")}</span>
          <span className="font-medium">{formatAmount(order?.amount)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("products")}</span>
          <Badge className={order?.orderTypeBadgeClass}>
            {t("productsCount", { count: order?.productsCount ?? 0 })}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end">
        <Button variant="outline" onClick={() => onAction?.(order)}>
          {t("rowAction")}
        </Button>
      </CardFooter>
    </Card>
  );
}

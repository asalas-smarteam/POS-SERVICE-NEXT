"use client";

import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const formatPrice = (price) =>
  Number(price || 0).toLocaleString("es-CL", {
    style: "currency",
    currency: "CLP",
  });

export function ProductTable({ products, onEdit, getCategoryLabel }) {
  const t = useTranslations("Products");
  const tType = useTranslations("ProductTypes");

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("name")}</TableHead>
          <TableHead>{t("type")}</TableHead>
          <TableHead>{t("category")}</TableHead>
          <TableHead>{t("price")}</TableHead>
          <TableHead>{t("ingredients")}</TableHead>
          <TableHead className="text-right">{t("actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product._id ?? product.name}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{tType(product.type)}</TableCell>
            <TableCell>
              <Badge variant="secondary">
                {getCategoryLabel ? getCategoryLabel(product) : t("uncategorized")}
              </Badge>
            </TableCell>
            <TableCell>{formatPrice(product.price)}</TableCell>
            <TableCell>{product.ingredients?.length ?? 0}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => onEdit?.(product)}>
                <Pencil className="mr-2 size-4" />
                {t("editProduct")}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

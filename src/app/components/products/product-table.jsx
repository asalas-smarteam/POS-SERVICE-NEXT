"use client";

import { Copy, Pencil } from "lucide-react";
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
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

export function ProductTable({ products, onEdit, onDuplicate, getCategoryLabel, getSizeLabel }) {
  const t = useTranslations("Products");
  const tType = useTranslations("ProductTypes");
  const { formatCurrency: formatPrice } = useCurrencyFormatter();

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>{t("name")}</TableHead>
          <TableHead>{t("type")}</TableHead>
          <TableHead>{t("category")}</TableHead>
          <TableHead>{t("size")}</TableHead>
          <TableHead>{t("price")}</TableHead>
          <TableHead>{t("ingredients")}</TableHead>
          <TableHead className="text-right">{t("actions")}</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => {
          const sizeLabel = getSizeLabel ? getSizeLabel(product) : null;
          return (
            <TableRow key={product._id ?? product.name}>
              <TableCell className="font-medium">{product.name}</TableCell>
              <TableCell>{tType(product.type)}</TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {getCategoryLabel ? getCategoryLabel(product) : t("uncategorized")}
                </Badge>
              </TableCell>
              <TableCell>
                {sizeLabel ? <Badge variant="outline">{sizeLabel}</Badge> : "—"}
              </TableCell>
              <TableCell>{formatPrice(product.price)}</TableCell>
              <TableCell>{product.ingredients?.length ?? 0}</TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => onDuplicate?.(product)}>
                    <Copy className="mr-2 size-4" />
                    {t("duplicateProduct")}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => onEdit?.(product)}>
                    <Pencil className="mr-2 size-4" />
                    {t("editProduct")}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}

"use client";

import { Copy, Package, Pencil } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCurrencyFormatter } from "@/hooks/useCurrencyFormatter";

export function ProductCard({ product, onEdit, onDuplicate, categoryLabel, sizeLabel }) {
  const t = useTranslations("Products");
  const tType = useTranslations("ProductTypes");
  const { formatCurrency: formatPrice } = useCurrencyFormatter();
  const ingredientsCount = product?.ingredients?.length ?? 0;

  return (
    <Card className="h-full">
      {product?.image?.url ? (
        <div className="relative -mt-6 mb-0 aspect-[4/3] w-full overflow-hidden rounded-t-xl border-b">
          <Image
            src={product.image.url}
            alt={product?.name ?? ""}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="object-cover"
          />
        </div>
      ) : null}
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="size-4 text-muted-foreground" />
          {product?.name ?? t("unknownProduct")}
        </CardTitle>
        <CardDescription className="flex flex-wrap items-center gap-2">
          <span>{tType(product?.type ?? "SIMPLE")}</span>
          {categoryLabel ? <Badge variant="secondary">{categoryLabel}</Badge> : null}
          {sizeLabel ? <Badge variant="outline">{sizeLabel}</Badge> : null}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("price")}</span>
          <span className="font-medium">{formatPrice(product?.price)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">{t("ingredients")}</span>
          <span className="font-medium">
            {ingredientsCount > 0 ? ingredientsCount : t("na")}
          </span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button variant="outline" onClick={() => onDuplicate?.(product)}>
          <Copy className="mr-2 size-4" />
          {t("duplicateProduct")}
        </Button>
        <Button variant="outline" onClick={() => onEdit?.(product)}>
          <Pencil className="mr-2 size-4" />
          {t("editProduct")}
        </Button>
      </CardFooter>
    </Card>
  );
}

"use client";

import { Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
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

export function ProductTable({ products, onEdit }) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Producto</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Precio</TableHead>
          <TableHead>Ingredientes</TableHead>
          <TableHead className="text-right">Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {products.map((product) => (
          <TableRow key={product._id ?? product.name}>
            <TableCell className="font-medium">{product.name}</TableCell>
            <TableCell>{product.type === "COMPOSED" ? "Compuesto" : "Simple"}</TableCell>
            <TableCell>{formatPrice(product.price)}</TableCell>
            <TableCell>{product.ingredients?.length ?? 0}</TableCell>
            <TableCell className="text-right">
              <Button variant="outline" size="sm" onClick={() => onEdit?.(product)}>
                <Pencil className="mr-2 size-4" />
                Editar
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

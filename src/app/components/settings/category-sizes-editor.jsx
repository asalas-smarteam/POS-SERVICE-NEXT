"use client";

import { Plus, Trash2 } from "lucide-react";
import { useLocale } from "next-intl";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getFieldLabel } from "@/components/settings/dynamic-json-table-editor";

// Bespoke editor for the "Product Category" tenant setting: on top of the
// generic id/label/active columns, it lets an admin toggle which of the
// tenant's configured sizes (Settings > Product Sizes) each category may
// use, plus whether the category needs kitchen preparation (drinks usually
// don't, so they never reach the kitchen board). The generic
// DynamicJsonTableEditor can't express this because a category row's
// `sizeIds` is an array-valued cell, which it only knows how to render as a
// plain text input.
export function CategorySizesEditor({ data, onChange, sizes = [], t }) {
  const locale = useLocale();
  const rows = Array.isArray(data) ? data : [];

  const updateRow = (rowIndex, patch) => {
    onChange(rows.map((row, index) => (index === rowIndex ? { ...row, ...patch } : row)));
  };

  const toggleSize = (rowIndex, sizeId, checked) => {
    const row = rows[rowIndex];
    const currentSizeIds = Array.isArray(row?.sizeIds) ? row.sizeIds : [];
    const nextSizeIds = checked
      ? [...new Set([...currentSizeIds, sizeId])]
      : currentSizeIds.filter((id) => id !== sizeId);
    updateRow(rowIndex, { sizeIds: nextSizeIds });
  };

  const addRow = () => {
    onChange([...rows, { id: "", label: "", active: true, sizeIds: [], requiresKitchen: true }]);
  };

  const removeRow = (rowIndex) => {
    onChange(rows.filter((_, index) => index !== rowIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{t("data")}</h4>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="mr-2 size-4" />
          {t("addRow")}
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{getFieldLabel("id", locale)}</TableHead>
              <TableHead>{getFieldLabel("label", locale)}</TableHead>
              <TableHead>{getFieldLabel("active", locale)}</TableHead>
              <TableHead>{t("requiresKitchenLabel")}</TableHead>
              <TableHead>{t("categorySizesLabel")}</TableHead>
              <TableHead className="w-[90px]">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  {t("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => {
                const rowSizeIds = Array.isArray(row?.sizeIds) ? row.sizeIds : [];
                return (
                  <TableRow key={`${row?.id ?? "row"}-${rowIndex}`}>
                    <TableCell>
                      <Input
                        value={row?.id ?? ""}
                        onChange={(event) => updateRow(rowIndex, { id: event.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={row?.label ?? ""}
                        onChange={(event) => updateRow(rowIndex, { label: event.target.value })}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={Boolean(row?.active)}
                        onCheckedChange={(checked) => updateRow(rowIndex, { active: Boolean(checked) })}
                      />
                    </TableCell>
                    <TableCell>
                      <Checkbox
                        checked={row?.requiresKitchen !== false}
                        onCheckedChange={(checked) =>
                          updateRow(rowIndex, { requiresKitchen: Boolean(checked) })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {sizes.length === 0 ? (
                        <span className="text-xs text-muted-foreground">{t("noSizesAvailable")}</span>
                      ) : (
                        <div className="flex flex-wrap gap-3">
                          {sizes.map((size) => (
                            <label
                              key={size.id}
                              className="flex items-center gap-1.5 text-xs font-medium"
                            >
                              <Checkbox
                                checked={rowSizeIds.includes(size.id)}
                                onCheckedChange={(checked) =>
                                  toggleSize(rowIndex, size.id, Boolean(checked))
                                }
                              />
                              {size.label ?? size.id}
                            </label>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => removeRow(rowIndex)}
                        aria-label={t("deleteRow")}
                      >
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

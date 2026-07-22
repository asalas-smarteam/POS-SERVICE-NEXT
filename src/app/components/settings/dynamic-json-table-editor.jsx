"use client";

import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const isObject = (value) =>
  Object.prototype.toString.call(value) === "[object Object]";

const toInputValue = (value) => {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value);
};

const parseInputValue = (input, previous) => {
  if (typeof previous === "number") {
    const parsed = Number(input);
    return Number.isNaN(parsed) ? previous : parsed;
  }
  return input;
};

const PAYMENT_STRATEGY_SELECT_OPTIONS = [
  { value: "pay_now", labelKey: "paymentStrategyPayNow" },
  { value: "pay_after_meal", labelKey: "paymentStrategyPayAfterMeal" },
  { value: "cashier_choice", labelKey: "paymentStrategyCashierChoice" },
];

// Visual-only labels for raw JSON field names coming from tenant settings
// documents. The underlying keys stay in English; only the on-screen label
// changes with the active locale.
const FIELD_LABELS = {
  currency: { es: "Moneda", en: "Currency" },
  code: { es: "Código", en: "Code" },
  symbol: { es: "Símbolo", en: "Symbol" },
  decimals: { es: "Decimales", en: "Decimals" },
  halfAndHalfPricing: { es: "Precios mitad y mitad", en: "Half and half pricing" },
  strategy: { es: "Estrategia", en: "Strategy" },
  extraAmount: { es: "Monto extra", en: "Extra amount" },
  paymentStrategy: { es: "Estrategia de cobro", en: "Payment strategy" },
  orderTypes: { es: "Tipos de orden", en: "Order types" },
  ingredients: { es: "Ingredientes", en: "Ingredients" },
  products: { es: "Productos", en: "Products" },
  id: { es: "Id", en: "Id" },
  label: { es: "Etiqueta", en: "Label" },
  isDefault: { es: "Por defecto", en: "Default" },
  active: { es: "Activo", en: "Active" },
};

export const getFieldLabel = (key, locale) => FIELD_LABELS[key]?.[locale] ?? key;

const PRICING_STRATEGY_SELECT_OPTIONS = [
  { value: "HIGHEST", labelKey: "chargeHighestPrice" },
  { value: "AVERAGE", labelKey: "chargeAveragePrice" },
  { value: "BASE_PLUS", labelKey: "chargeHighestPlusFee" },
];

const renderSelectInput = ({ value, placeholder, options, onValueChange, t }) => {
  const normalizedValue = toInputValue(value);
  const hasValue = options.some((option) => option.value === normalizedValue);

  return (
    <Select value={hasValue ? normalizedValue : undefined} onValueChange={onValueChange}>
      <SelectTrigger className="w-full">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value}>
            {t(option.labelKey)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

function PrimitiveObjectEditor({ data, onChange, t, locale, parentKey = "" }) {
  const entries = Object.entries(data ?? {});

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>{t("key")}</TableHead>
            <TableHead>{t("value")}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([key, value]) => (
            <TableRow key={key}>
              <TableCell className="font-medium">{getFieldLabel(key, locale)}</TableCell>
              <TableCell>
                {typeof value === "boolean" ? (
                  <Checkbox
                    checked={value}
                    onCheckedChange={(checked) => onChange({ ...data, [key]: Boolean(checked) })}
                  />
                ) : parentKey === "halfAndHalfPricing" && key === "strategy" ? (
                  renderSelectInput({
                    value,
                    placeholder: t("selectPricingStrategy"),
                    options: PRICING_STRATEGY_SELECT_OPTIONS,
                    onValueChange: (nextValue) =>
                      onChange({
                        ...data,
                        [key]: nextValue,
                      }),
                    t,
                  })
                ) : (
                  <Input
                    value={toInputValue(value)}
                    onChange={(event) =>
                      onChange({
                        ...data,
                        [key]: parseInputValue(event.target.value, value),
                      })
                    }
                  />
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function ArrayEditor({ data, onChange, title, t, locale }) {
  const rows = Array.isArray(data) ? data : [];
  const columns = Array.from(
    rows.reduce((acc, row) => {
      Object.keys(row || {}).forEach((key) => acc.add(key));
      return acc;
    }, new Set())
  );

  const resolvedColumns = columns.length ? columns : ["id", "label"];

  const updateCell = (rowIndex, key, value, previousValue) => {
    const nextRows = rows.map((row, index) => {
      if (index !== rowIndex) {
        return row;
      }
      return {
        ...row,
        [key]: parseInputValue(value, previousValue),
      };
    });
    onChange(nextRows);
  };

  const addRow = () => {
    const newRow = resolvedColumns.reduce((acc, key) => {
      acc[key] = key === "active" ? true : "";
      return acc;
    }, {});
    onChange([...rows, newRow]);
  };

  const removeRow = (rowIndex) => {
    onChange(rows.filter((_, index) => index !== rowIndex));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold">{title}</h4>
        <Button type="button" size="sm" variant="outline" onClick={addRow}>
          <Plus className="mr-2 size-4" />
          {t("addRow")}
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {resolvedColumns.map((column) => (
                <TableHead key={column}>{getFieldLabel(column, locale)}</TableHead>
              ))}
              <TableHead className="w-[90px]">{t("actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={resolvedColumns.length + 1} className="text-center text-muted-foreground">
                  {t("noResults")}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row, rowIndex) => (
                <TableRow key={`${row?.id ?? "row"}-${rowIndex}`}>
                  {resolvedColumns.map((column) => {
                    const value = row?.[column];
                    const isBoolean = typeof value === "boolean" || column === "active";

                    return (
                      <TableCell key={`${column}-${rowIndex}`}>
                        {isBoolean ? (
                          <Checkbox
                            checked={Boolean(value)}
                            onCheckedChange={(checked) =>
                              updateCell(rowIndex, column, Boolean(checked), value)
                            }
                          />
                        ) : (
                          <Input
                            value={toInputValue(value)}
                            onChange={(event) =>
                              updateCell(rowIndex, column, event.target.value, value)
                            }
                          />
                        )}
                      </TableCell>
                    );
                  })}
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export function DynamicJsonTableEditor({ data, onChange }) {
  const t = useTranslations("Settings");
  const locale = useLocale();

  if (Array.isArray(data)) {
    return <ArrayEditor data={data} onChange={onChange} title={t("data")} t={t} locale={locale} />;
  }

  if (isObject(data)) {
    const hasNestedCollections = Object.values(data).some(
      (value) => Array.isArray(value) || isObject(value)
    );

    if (!hasNestedCollections) {
      return <PrimitiveObjectEditor data={data} onChange={onChange} t={t} locale={locale} />;
    }

    return (
      <div className="space-y-4">
        {Object.entries(data).map(([sectionKey, sectionValue]) => (
          <div key={sectionKey} className="space-y-2">
            <Label className="text-sm font-semibold">{getFieldLabel(sectionKey, locale)}</Label>
            {Array.isArray(sectionValue) ? (
                <ArrayEditor
                  data={sectionValue}
                  onChange={(nextSection) => onChange({ ...data, [sectionKey]: nextSection })}
                  title={t("section", { name: getFieldLabel(sectionKey, locale) })}
                  t={t}
                  locale={locale}
                />
              ) : isObject(sectionValue) ? (
                <PrimitiveObjectEditor
                  data={sectionValue}
                  onChange={(nextSection) => onChange({ ...data, [sectionKey]: nextSection })}
                  t={t}
                  locale={locale}
                  parentKey={sectionKey}
                />
            ) : sectionKey === "paymentStrategy" ? (
              renderSelectInput({
                value: sectionValue,
                placeholder: t("paymentStrategyPlaceholder"),
                options: PAYMENT_STRATEGY_SELECT_OPTIONS,
                onValueChange: (nextValue) =>
                  onChange({
                    ...data,
                    [sectionKey]: nextValue,
                  }),
                t,
              })
            ) : (
              <Input
                value={toInputValue(sectionValue)}
                onChange={(event) =>
                  onChange({
                    ...data,
                    [sectionKey]: parseInputValue(event.target.value, sectionValue),
                  })
                }
              />
            )}
          </div>
        ))}
      </div>
    );
  }

  return <p className="text-sm text-muted-foreground">{t("unsupportedFormat")}</p>;
}

"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
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

function PrimitiveObjectEditor({ data, onChange }) {
  const entries = Object.entries(data ?? {});

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Key</TableHead>
            <TableHead>Valor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {entries.map(([key, value]) => (
            <TableRow key={key}>
              <TableCell className="font-medium">{key}</TableCell>
              <TableCell>
                {typeof value === "boolean" ? (
                  <Checkbox
                    checked={value}
                    onCheckedChange={(checked) => onChange({ ...data, [key]: Boolean(checked) })}
                  />
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

function ArrayEditor({ data, onChange, title }) {
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
          Agregar fila
        </Button>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {resolvedColumns.map((column) => (
                <TableHead key={column}>{column}</TableHead>
              ))}
              <TableHead className="w-[90px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={resolvedColumns.length + 1} className="text-center text-muted-foreground">
                  No hay filas.
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
                      aria-label="Eliminar fila"
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
  if (Array.isArray(data)) {
    return <ArrayEditor data={data} onChange={onChange} title="Datos" />;
  }

  if (isObject(data)) {
    const hasNestedCollections = Object.values(data).some(
      (value) => Array.isArray(value) || isObject(value)
    );

    if (!hasNestedCollections) {
      return <PrimitiveObjectEditor data={data} onChange={onChange} />;
    }

    return (
      <div className="space-y-4">
        {Object.entries(data).map(([sectionKey, sectionValue]) => (
          <div key={sectionKey} className="space-y-2">
            <Label className="text-sm font-semibold capitalize">{sectionKey}</Label>
            {Array.isArray(sectionValue) ? (
              <ArrayEditor
                data={sectionValue}
                onChange={(nextSection) => onChange({ ...data, [sectionKey]: nextSection })}
                title={`Sección ${sectionKey}`}
              />
            ) : isObject(sectionValue) ? (
              <PrimitiveObjectEditor
                data={sectionValue}
                onChange={(nextSection) => onChange({ ...data, [sectionKey]: nextSection })}
              />
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

  return <p className="text-sm text-muted-foreground">Formato no soportado.</p>;
}

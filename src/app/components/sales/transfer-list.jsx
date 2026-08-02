"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronsLeft, ChevronsRight, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

const HOLD_MS = 600;

// Lista dual por cantidad: cada item tiene N unidades pendientes y la seleccion
// es un mapa { lineId: unidades }. Un toque mueve UNA unidad; mantener
// presionado (~600ms) mueve todas las de esa linea. Mas agil en pantalla tactil
// que un input numerico, y permite cobrar 2 de 10 Coca Colas.
export function TransferList({
  items = [],
  selection = {},
  onChange,
  leftTitle,
  rightTitle,
  emptyLeft,
  emptyRight,
  formatCurrency = (value) => value,
  holdHint,
}) {
  // Un long-press mueve todas las unidades, con lo que la fila desaparece de su
  // panel y otra ocupa su lugar bajo el dedo. El flag vive aqui (no en la fila)
  // justamente porque la fila se desmonta: sirve para descartar el click que
  // sigue al hold, sin importar sobre que fila caiga.
  const heldRef = useRef(false);

  const selectedOf = (id) => Math.max(0, Number(selection?.[String(id)] ?? 0));

  const setQuantity = (id, quantity) => {
    const key = String(id);
    const item = items.find((it) => String(it.id) === key);
    const max = Math.max(0, Number(item?.quantity ?? 0));
    const next = { ...selection };
    const clamped = Math.min(max, Math.max(0, quantity));
    if (clamped > 0) {
      next[key] = clamped;
    } else {
      delete next[key];
    }
    onChange?.(next);
  };

  const addUnits = (id, delta) => setQuantity(id, selectedOf(id) + delta);

  const selectAll = () =>
    onChange?.(
      items.reduce((acc, it) => {
        const quantity = Math.max(0, Number(it.quantity ?? 0));
        if (quantity > 0) {
          acc[String(it.id)] = quantity;
        }
        return acc;
      }, {})
    );

  const left = items
    .map((it) => ({ ...it, units: Math.max(0, Number(it.quantity ?? 0)) - selectedOf(it.id) }))
    .filter((it) => it.units > 0);
  const right = items
    .map((it) => ({ ...it, units: selectedOf(it.id) }))
    .filter((it) => it.units > 0);

  const renderPane = (title, list, empty, side) => (
    <Pane title={title} list={list} empty={empty}>
      {list.map((it) => (
        <Row
          key={it.id}
          item={it}
          side={side}
          formatCurrency={formatCurrency}
          holdHint={holdHint}
          heldRef={heldRef}
          onTap={() => addUnits(it.id, side === "left" ? 1 : -1)}
          onHold={() =>
            side === "left"
              ? setQuantity(it.id, Number(it.quantity ?? 0))
              : setQuantity(it.id, 0)
          }
          onIncrease={() => addUnits(it.id, 1)}
          onDecrease={() => addUnits(it.id, -1)}
        />
      ))}
    </Pane>
  );

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row">
      {renderPane(leftTitle, left, emptyLeft, "left")}
      <div className="flex items-center justify-center gap-2 sm:flex-col">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={selectAll}
          aria-label="all-right"
        >
          <ChevronsRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => onChange?.({})}
          aria-label="all-left"
        >
          <ChevronsLeft className="size-4" />
        </Button>
      </div>
      {renderPane(rightTitle, right, emptyRight, "right")}
    </div>
  );
}

function Pane({ title, list, empty, children }) {
  return (
    <div className="flex-1 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between border-b border-slate-200 bg-muted/40 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:border-slate-700">
        <span>{title}</span>
        {/* El contador son unidades, no lineas. */}
        <span className="rounded bg-slate-200 px-1.5 text-[11px] text-slate-700 dark:bg-slate-700 dark:text-slate-200">
          {list.reduce((sum, it) => sum + it.units, 0)}
        </span>
      </div>
      <ScrollArea className="h-56">
        {list.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>
        )}
      </ScrollArea>
    </div>
  );
}

function Row({
  item,
  side,
  formatCurrency,
  holdHint,
  heldRef,
  onTap,
  onHold,
  onIncrease,
  onDecrease,
}) {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const startHold = () => {
    setHolding(true);
    timerRef.current = setTimeout(() => {
      setHolding(false);
      heldRef.current = true;
      onHold();
    }, HOLD_MS);
  };

  const cancelHold = () => {
    clearTimeout(timerRef.current);
    setHolding(false);
  };

  const handleClick = () => {
    // El click que sigue a un long-press ya fue atendido por onHold.
    if (heldRef.current) {
      heldRef.current = false;
      return;
    }
    onTap();
  };

  const amount = item.units * Number(item.unitPrice ?? 0);
  const isMultiUnit = Number(item.quantity ?? 0) > 1;

  return (
    <li className="flex items-center gap-1 pr-2">
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={isMultiUnit ? startHold : undefined}
        onPointerUp={isMultiUnit ? cancelHold : undefined}
        onPointerLeave={isMultiUnit ? cancelHold : undefined}
        onPointerCancel={isMultiUnit ? cancelHold : undefined}
        onContextMenu={(event) => event.preventDefault()}
        title={isMultiUnit ? holdHint : undefined}
        className={cn(
          "flex min-w-0 flex-1 items-center justify-between gap-2 px-3 py-2 text-left text-sm transition-colors hover:bg-blue-500/5",
          holding && "bg-blue-500/20"
        )}
      >
        <span className="min-w-0 truncate">
          {item.units > 1 ? `${item.units}× ` : ""}
          {item.name}
        </span>
        <span className="shrink-0 font-medium text-muted-foreground">
          {formatCurrency(amount)}
        </span>
      </button>

      {/* Ajuste fino de unidades, solo en el panel de este pago. */}
      {side === "right" && isMultiUnit ? (
        <div className="flex shrink-0 items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onDecrease}
            aria-label="decrease-units"
          >
            <Minus className="size-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-7"
            onClick={onIncrease}
            disabled={item.units >= Number(item.quantity ?? 0)}
            aria-label="increase-units"
          >
            <Plus className="size-3.5" />
          </Button>
        </div>
      ) : null}
    </li>
  );
}

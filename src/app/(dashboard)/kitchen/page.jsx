"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  CheckCheck,
  CircleUserRound,
  Clock3,
  Flame,
  Plus,
  Search,
  Send,
} from "lucide-react";
import { AppAlert } from "@/components/app-alert";
import { AppSpinner } from "@/components/app-spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useKitchenStore } from "../../../store/kitchenStore";

const STATUS_COLUMNS = [
  {
    key: "IN_PREPARATION",
    label: "EN PREPARACIÓN",
    buttonLabel: "Mover a Horno",
    icon: Clock3,
    iconClass: "text-amber-400",
    columnClass: "border-sky-950/70 bg-sky-950/35",
    cardAccentClass: "border-l-red-500",
  },
  {
    key: "IN_OVEN",
    label: "EN HORNO",
    buttonLabel: "Marcar como Listo",
    icon: Flame,
    iconClass: "text-orange-500",
    columnClass: "border-orange-900/40 bg-orange-950/10",
    cardAccentClass: "border-l-orange-500",
  },
  {
    key: "READY",
    label: "LISTO PARA SERVIR",
    buttonLabel: "Despachar Pedido",
    icon: CheckCheck,
    iconClass: "text-green-500",
    columnClass: "border-emerald-900/50 bg-emerald-950/10",
    cardAccentClass: "border-l-emerald-500",
  },
];

const NAV_ITEMS = ["Kitchen Board", "Inventory", "Staff", "Settings"];

const normalizeOrderNumber = (orderId) => {
  if (!orderId) return "000";
  const trimmed = String(orderId).slice(-5);
  return trimmed.padStart(3, "0");
};

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const buildItemNotes = (item) => {
  if (Array.isArray(item?.notes) && item.notes.length) return item.notes;

  const modifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];
  return modifiers.flatMap((modifier) => {
    const baseQuantity = Number(modifier.baseQuantity ?? 0);
    const quantity = Number(modifier.quantity ?? 0);
    const name = modifier.name?.toLowerCase();

    if (!name) return [];
    if (baseQuantity > 0 && quantity === 0) return [`quitar ${name}`];
    if (quantity > baseQuantity) return [`extra ${name}`];

    return [];
  });
};

const getElapsedMs = (ticket, now) => {
  const startedAt = ticket?.kitchenStartedAt ? new Date(ticket.kitchenStartedAt).getTime() : null;
  if (!startedAt) return 0;

  if (ticket?.kitchenStatus === "READY") {
    const completedAt = ticket?.kitchenCompletedAt ? new Date(ticket.kitchenCompletedAt).getTime() : now;
    return completedAt - startedAt;
  }

  return now - startedAt;
};

function KitchenTicketCard({ ticket, columnMeta, elapsedLabel, onContinue, onCancel }) {
  const orderItems = Array.isArray(ticket.items)
    ? ticket.items.map((item) => ({
        name: item.productName || "Producto",
        quantity: item.quantity,
        notes: buildItemNotes(item),
      }))
    : [];

  const isReady = ticket.kitchenStatus === "READY";
  const isInOven = ticket.kitchenStatus === "IN_OVEN";

  return (
    <article
      className={`rounded-xl border border-slate-700/80 bg-slate-800/80 p-4 shadow-sm ${columnMeta.cardAccentClass} border-l-4`}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-sky-400">#{normalizeOrderNumber(ticket._id)}</p>
          <h4 className="text-4xl font-black text-slate-100">Mesa {ticket.tableName || ticket.tableNumber || "-"}</h4>
        </div>
        <div className="flex flex-col items-end text-xs">
          <span className={`flex items-center gap-1 font-bold ${isInOven ? "text-orange-400" : "text-red-400"}`}>
            <Clock3 className="size-3.5" />
            {elapsedLabel}
          </span>
          <span className="text-[10px] uppercase tracking-wide text-slate-400">Wait Time</span>
        </div>
      </div>

      <div className="mb-4 space-y-2 border-b border-slate-700 pb-3 text-slate-300">
        <p className="flex items-center gap-2 text-lg">
          <CircleUserRound className="size-4" />
          Waiter: {ticket.waiterName || "N/A"}
        </p>
      </div>

      <ul className="mb-4 space-y-2 text-slate-100">
        {orderItems.map((item, idx) => (
          <li key={`${ticket._id}-${item.name}-${idx}`} className={isReady ? "text-slate-400 line-through" : ""}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-lg font-semibold">
                {item.quantity}x {item.name}
              </span>
              {isReady ? <Check className="size-4 text-emerald-400" /> : null}
              {isInOven ? <Flame className="size-4 text-orange-400" /> : null}
            </div>
            {item.notes?.length ? (
              <p className="pl-1 text-xs text-slate-400">{item.notes.join(" · ")}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <Button
        onClick={() => onContinue(ticket)}
        className={`w-full font-bold ${isReady ? "bg-slate-700 hover:bg-slate-600" : "bg-blue-500 hover:bg-blue-400"}`}
      >
        {columnMeta.buttonLabel}
        {isReady ? <Send className="size-4" /> : <Check className="size-4" />}
      </Button>
      {!isReady ? (
        <button
          type="button"
          onClick={() => onCancel(ticket)}
          className="mt-2 w-full text-xs text-slate-400 underline-offset-2 hover:text-red-300 hover:underline"
        >
          Cancelar ticket
        </button>
      ) : null}
    </article>
  );
}

function KitchenColumn({ columnMeta, tickets, now, onContinue, onCancel }) {
  const Icon = columnMeta.icon;

  return (
    <section className="flex min-h-0 flex-col gap-4">
      <header className="flex items-center gap-2 px-1">
        <Icon className={`size-5 ${columnMeta.iconClass}`} />
        <h3 className="text-3xl font-bold tracking-wide text-slate-200">{columnMeta.label}</h3>
        <span className="rounded-full bg-slate-700 px-2 py-0.5 text-xs font-bold text-slate-200">{tickets.length}</span>
      </header>

      <div className={`min-h-[60vh] space-y-4 rounded-xl border border-dashed p-3 ${columnMeta.columnClass}`}>
        {tickets.length ? (
          tickets.map((ticket) => (
            <KitchenTicketCard
              key={ticket._id}
              ticket={ticket}
              columnMeta={columnMeta}
              elapsedLabel={formatDuration(getElapsedMs(ticket, now))}
              onContinue={onContinue}
              onCancel={onCancel}
            />
          ))
        ) : (
          <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/60 p-4 text-sm text-slate-400">
            No hay tickets en esta columna.
          </div>
        )}
      </div>
    </section>
  );
}

export default function KitchenPage() {
  const [search, setSearch] = useState("");

  const { tickets, loading, error, now, fetchTickets, updateTicketStatus, startTimer, stopTimer } = useKitchenStore(
    (state) => ({
      tickets: state.tickets,
      loading: state.loading,
      error: state.error,
      now: state.now,
      fetchTickets: state.fetchTickets,
      updateTicketStatus: state.updateTicketStatus,
      startTimer: state.startTimer,
      stopTimer: state.stopTimer,
    })
  );

  useEffect(() => {
    fetchTickets();
    startTimer();

    const interval = setInterval(fetchTickets, 10000);
    return () => {
      clearInterval(interval);
      stopTimer();
    };
  }, [fetchTickets, startTimer, stopTimer]);

  const filteredTickets = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return tickets;

    return tickets.filter((ticket) => {
      const items = Array.isArray(ticket.items) ? ticket.items : [];
      const haystack = [
        normalizeOrderNumber(ticket._id),
        ticket.tableName,
        ticket.tableNumber,
        ticket.waiterName,
        ...items.map((item) => item.productName),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(term);
    });
  }, [search, tickets]);

  const ticketsByStatus = useMemo(
    () =>
      STATUS_COLUMNS.reduce((acc, column) => {
        acc[column.key] = filteredTickets.filter((ticket) => ticket.kitchenStatus === column.key);
        return acc;
      }, {}),
    [filteredTickets]
  );

  const activeTickets = useMemo(
    () => tickets.filter((ticket) => ticket.kitchenStatus !== "CANCELLED"),
    [tickets]
  );

  const averageTimeLabel = useMemo(() => {
    if (!activeTickets.length) return "00:00 min";
    const totalElapsed = activeTickets.reduce((sum, ticket) => sum + getElapsedMs(ticket, now), 0);
    return `${formatDuration(totalElapsed / activeTickets.length)} min`;
  }, [activeTickets, now]);

  const pendingDelivery = ticketsByStatus.READY?.length ?? 0;

  const handleContinue = async (ticket) => {
    if (ticket.kitchenStatus === "IN_PREPARATION") {
      await updateTicketStatus(ticket._id, "IN_OVEN");
      return;
    }

    if (ticket.kitchenStatus === "IN_OVEN") {
      await updateTicketStatus(ticket._id, "READY");
      return;
    }
  };

  const handleCancel = async (ticket) => {
    await updateTicketStatus(ticket._id, "CANCELLED");
  };

  return (
    <div className="h-full overflow-auto bg-[#061426] text-slate-100">
      <header className="sticky top-0 z-30 border-b border-slate-800 bg-[#061426]/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-6">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-blue-500 p-1.5 text-white">✕</div>
              <h1 className="text-3 font-bold">Kitchen<span className="text-blue-500">POS</span></h1>
            </div>
            <nav className="hidden md:flex items-center gap-6">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={`border-b-2 pb-5 pt-5 text-sm font-medium ${item === "Kitchen Board" ? "border-blue-500 text-blue-500" : "border-transparent text-slate-400"}`}
                >
                  {item}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search orders..."
                className="w-72 border-slate-700 bg-slate-800 pl-10 text-slate-100 placeholder:text-slate-400"
              />
            </div>
            <Button className="bg-blue-500 font-bold text-white hover:bg-blue-400">
              <Plus className="size-4" /> New Order
            </Button>
            <div className="flex size-10 items-center justify-center rounded-full border-2 border-amber-300/50 bg-slate-700 text-xs">
              👨‍🍳
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1600px] flex-col gap-8 p-6 pb-28">
        <section className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="text-5xl font-black">Kitchen Kanban Board</h2>
            <p className="mt-1 text-lg text-slate-400">Manage active orders and preparation stages in real-time.</p>
          </div>
          <div className="rounded-lg bg-slate-800 px-4 py-2">
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400">Total Active</span>
                <span className="text-2xl font-bold">{activeTickets.length} Orders</span>
              </div>
              <div className="h-8 w-px bg-slate-600" />
              <div className="flex flex-col">
                <span className="text-[10px] font-bold uppercase text-slate-400">Avg. Time</span>
                <span className="text-2xl font-bold">{averageTimeLabel}</span>
              </div>
            </div>
          </div>
        </section>

        {error ? <AppAlert type="error" message={error} /> : null}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <AppSpinner size={16} inline /> Actualizando...
          </div>
        ) : null}

        <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
          {STATUS_COLUMNS.map((columnMeta) => (
            <KitchenColumn
              key={columnMeta.key}
              columnMeta={columnMeta}
              tickets={ticketsByStatus[columnMeta.key] ?? []}
              now={now}
              onContinue={handleContinue}
              onCancel={handleCancel}
            />
          ))}
        </section>
      </main>

      <footer
        className="fixed bottom-0 left-0 right-0 bg-white dark:bg-background-dark border-t border-slate-200 dark:border-slate-800 px-6 py-3 z-40"
      >
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2 text-slate-500">
              <span>{pendingDelivery} Pending Delivery</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate-500 font-medium">Last synced: Just now</span>
            <button
              type="button"
              onClick={fetchTickets}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-500"
            >
              <span className="material-symbols-outlined">refresh</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

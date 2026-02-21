"use client";

import { useEffect, useMemo } from "react";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { AppSpinner } from "@/components/app-spinner";
import { KitchenTicketContent } from "@/components/sales/kitchen-ticket-content";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useKitchenStore } from "../../../store/kitchenStore";

const STATUS_COLUMNS = [
  { key: "EN_PREPARACION", label: "En preparación" },
  { key: "EN_HORNO", label: "En horno" },
  { key: "LISTO", label: "Listo" },
];

const normalizeOrderNumber = (orderId) => {
  if (!orderId) {
    return "000";
  }
  const trimmed = String(orderId).slice(-5);
  return trimmed.padStart(3, "0");
};

const formatDuration = (ms) => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
};

const buildItemNotes = (item) => {
  if (Array.isArray(item?.notes) && item.notes.length) {
    return item.notes;
  }

  const modifiers = Array.isArray(item?.modifiers) ? item.modifiers : [];
  return modifiers.flatMap((modifier) => {
    const baseQuantity = Number(modifier.baseQuantity ?? 0);
    const quantity = Number(modifier.quantity ?? 0);
    const name = modifier.name?.toLowerCase();
    if (!name) {
      return [];
    }
    if (baseQuantity > 0 && quantity === 0) {
      return [`quitar ${name}`];
    }
    if (quantity > baseQuantity) {
      return [`extra ${name}`];
    }
    return [];
  });
};

const getElapsedMs = (ticket, now) => {
  const startedAt = ticket?.kitchenStartedAt ? new Date(ticket.kitchenStartedAt).getTime() : null;
  if (!startedAt) {
    return 0;
  }

  if (ticket?.kitchenStatus === "LISTO") {
    const completedAt = ticket?.kitchenCompletedAt
      ? new Date(ticket.kitchenCompletedAt).getTime()
      : now;
    return completedAt - startedAt;
  }

  return now - startedAt;
};

export default function KitchenPage() {
  const {
    tickets,
    loading,
    error,
    now,
    fetchTickets,
    updateTicketStatus,
    startTimer,
    stopTimer,
  } = useKitchenStore((state) => ({
    tickets: state.tickets,
    loading: state.loading,
    error: state.error,
    now: state.now,
    fetchTickets: state.fetchTickets,
    updateTicketStatus: state.updateTicketStatus,
    startTimer: state.startTimer,
    stopTimer: state.stopTimer,
  }));

  useEffect(() => {
    fetchTickets();
    startTimer();

    const interval = setInterval(() => {
      fetchTickets();
    }, 10000);

    return () => {
      clearInterval(interval);
      stopTimer();
    };
  }, [fetchTickets, startTimer, stopTimer]);

  const ticketsByStatus = useMemo(() => {
    return STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.key] = tickets.filter((ticket) => ticket.kitchenStatus === column.key);
      return acc;
    }, {});
  }, [tickets]);

  const handleContinue = (ticket) => {
    if (ticket.kitchenStatus === "EN_PREPARACION") {
      updateTicketStatus(ticket._id, "EN_HORNO");
      return;
    }
    if (ticket.kitchenStatus === "EN_HORNO") {
      updateTicketStatus(ticket._id, "LISTO");
    }
  };

  const handleCancel = (ticket) => {
    updateTicketStatus(ticket._id, "CANCELADO");
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-6 px-4 py-6 lg:px-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-foreground">Cocina</h1>
            <p className="text-sm text-muted-foreground">
              Monitorea y gestiona las órdenes en tiempo real.
            </p>
          </div>
          {loading ? (
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <AppSpinner size={16} inline />
              Actualizando...
            </span>
          ) : null}
        </div>

        {error ? <AppAlert type="error" message={error} /> : null}

        {loading && !tickets.length ? (
          <div className="grid gap-4 lg:grid-cols-3">
            {STATUS_COLUMNS.map((column) => (
              <Card key={column.key} className="h-[640px]">
                <CardHeader>
                  <CardTitle>{column.label}</CardTitle>
                </CardHeader>
                <CardContent>
                  <AppSkeleton className="h-[520px] w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {STATUS_COLUMNS.map((column) => {
              const columnTickets = ticketsByStatus[column.key] ?? [];
              return (
                <Card key={column.key} className="flex h-[640px] flex-col">
                  <CardHeader className="space-y-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{column.label}</CardTitle>
                      <Badge variant="secondary">{columnTickets.length}</Badge>
                    </div>
                    <Separator />
                  </CardHeader>
                  <CardContent className="flex-1">
                    <ScrollArea className="h-[520px] pr-3">
                      <div className="space-y-4">
                        {columnTickets.length ? (
                          columnTickets.map((ticket) => {
                            const orderItems = Array.isArray(ticket.items)
                              ? ticket.items.map((item) => ({
                                  name: item.productName || "Producto",
                                  quantity: item.quantity,
                                  notes: buildItemNotes(item),
                                }))
                              : [];
                            const orderNotes = Array.isArray(ticket.notes)
                              ? ticket.notes
                              : ticket.note
                                ? [ticket.note]
                                : [];

                            return (
                              <Card key={ticket._id} className="border-border/60 bg-background shadow-sm">
                                <CardContent className="space-y-3 p-4">
                                  <div className="flex items-center justify-between">
                                    <Badge variant="outline">#{normalizeOrderNumber(ticket._id)}</Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {formatDuration(getElapsedMs(ticket, now))}
                                    </span>
                                  </div>

                                  <KitchenTicketContent
                                    className="w-full"
                                    orderNumber={normalizeOrderNumber(ticket._id)}
                                    datetimeValue={new Date(ticket.createdAt ?? Date.now()).toLocaleString()}
                                    items={orderItems}
                                    orderNotes={orderNotes}
                                  />

                                  <div className="flex items-center justify-end gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCancel(ticket)}
                                      disabled={ticket.kitchenStatus === "CANCELADO"}
                                    >
                                      Cancelar
                                    </Button>

                                    {ticket.kitchenStatus === "EN_PREPARACION" ? (
                                      <Button size="sm" onClick={() => handleContinue(ticket)}>
                                        Pasar a Horno
                                      </Button>
                                    ) : null}

                                    {ticket.kitchenStatus === "EN_HORNO" ? (
                                      <Button size="sm" onClick={() => handleContinue(ticket)}>
                                        Marcar como Listo
                                      </Button>
                                    ) : null}
                                  </div>
                                </CardContent>
                              </Card>
                            );
                          })
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No hay tickets en esta columna.
                          </p>
                        )}
                      </div>
                    </ScrollArea>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

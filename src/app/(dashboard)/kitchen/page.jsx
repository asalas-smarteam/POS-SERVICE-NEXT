"use client";

import { useEffect, useMemo } from "react";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { AppSpinner } from "@/components/app-spinner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useKitchenStore } from "../../../store/kitchenStore";
import { useProductsStore } from "../../../store/productsStore";

const STATUS_COLUMNS = [
  { key: "EN_ESPERA", label: "En espera" },
  { key: "EN_PROCESO", label: "En proceso" },
  { key: "LISTO", label: "Listo para entregar" },
  { key: "ELIMINADO", label: "Eliminado" },
];

const normalizeOrderNumber = (orderId) => {
  if (!orderId) {
    return "000";
  }
  const trimmed = String(orderId).slice(-5);
  return trimmed.padStart(3, "0");
};

const formatDuration = (ms) => {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
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

const normalizeStatus = (status) => (status === "COCINA" ? "EN_ESPERA" : status);

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

  const { products, fetchProducts } = useProductsStore((state) => ({
    products: state.products,
    fetchProducts: state.fetchProducts,
  }));

  useEffect(() => {
    fetchTickets();
    fetchProducts();
    startTimer();

    const interval = setInterval(() => {
      fetchTickets();
    }, 10000);

    return () => {
      clearInterval(interval);
      stopTimer();
    };
  }, [fetchTickets, fetchProducts, startTimer, stopTimer]);

  const productNameMap = useMemo(() => {
    return (products || []).reduce((acc, product) => {
      acc[product._id ?? product.id ?? product.sku ?? product.name] =
        product.name ?? "Producto";
      return acc;
    }, {});
  }, [products]);

  const ticketsByStatus = useMemo(() => {
    return STATUS_COLUMNS.reduce((acc, column) => {
      acc[column.key] = tickets.filter(
        (ticket) => normalizeStatus(ticket.status) === column.key
      );
      return acc;
    }, {});
  }, [tickets]);

  const handleContinue = (ticket) => {
    const status = normalizeStatus(ticket.status);
    if (status === "EN_ESPERA") {
      updateTicketStatus(ticket._id, "EN_PROCESO");
      return;
    }
    if (status === "EN_PROCESO") {
      updateTicketStatus(ticket._id, "LISTO");
    }
  };

  const handleCancel = (ticket) => {
    updateTicketStatus(ticket._id, "ELIMINADO");
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
          <div className="grid gap-4 lg:grid-cols-4">
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
          <div className="grid gap-4 lg:grid-cols-4">
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
                            const createdAt = ticket.createdAt
                              ? new Date(ticket.createdAt).getTime()
                              : Date.now();
                            const elapsed = formatDuration(
                              Math.max(0, now - createdAt)
                            );
                            const orderItems = Array.isArray(ticket.items)
                              ? ticket.items
                              : [];
                            const orderNotes = Array.isArray(ticket.notes)
                              ? ticket.notes
                              : ticket.note
                                ? [ticket.note]
                                : [];

                            return (
                              <Card
                                key={ticket._id}
                                className="border-border/60 bg-background shadow-sm"
                              >
                                <CardContent className="space-y-3 p-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <h3 className="text-lg font-semibold">
                                        #{normalizeOrderNumber(ticket._id)}
                                      </h3>
                                      <Badge variant="outline">
                                        {normalizeStatus(ticket.status).replace(
                                          "_",
                                          " "
                                        )}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      Mesa / Tipo · Sin asignar
                                    </p>
                                  </div>

                                  <div className="space-y-2">
                                    {orderItems.map((item, index) => {
                                      const productName =
                                        item.productName ||
                                        productNameMap[item.productId] ||
                                        "Producto";
                                      const notes = buildItemNotes(item);
                                      return (
                                        <div key={`${item.productId}-${index}`}>
                                          <p className="text-sm font-semibold">
                                            {item.quantity}x {productName}
                                          </p>
                                          {notes.length ? (
                                            <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                                              {notes.map((note, idx) => (
                                                <li key={`${note}-${idx}`}>
                                                  - {note}
                                                </li>
                                              ))}
                                            </ul>
                                          ) : null}
                                        </div>
                                      );
                                    })}
                                  </div>

                                  <div className="rounded-md border border-dashed border-border/70 bg-muted/40 p-2 text-xs">
                                    <p className="font-semibold text-foreground">
                                      Notas
                                    </p>
                                    {orderNotes.length ? (
                                      <ul className="mt-1 space-y-1 text-muted-foreground">
                                        {orderNotes.map((note, idx) => (
                                          <li key={`${note}-${idx}`}>
                                            - {note}
                                          </li>
                                        ))}
                                      </ul>
                                    ) : (
                                      <p className="text-muted-foreground">
                                        Sin notas
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center justify-between">
                                    <span className="text-xs text-muted-foreground">
                                      Tiempo: {elapsed}
                                    </span>
                                    <div className="flex items-center gap-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleCancel(ticket)}
                                        disabled={ticket.status === "ELIMINADO"}
                                      >
                                        Cancelar
                                      </Button>
                                      <Button
                                        size="sm"
                                        onClick={() => handleContinue(ticket)}
                                        disabled={
                                          normalizeStatus(ticket.status) ===
                                            "LISTO" ||
                                          ticket.status === "ELIMINADO"
                                        }
                                      >
                                        Continuar
                                      </Button>
                                    </div>
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

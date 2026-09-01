"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LayoutGrid, List, Search, Table as TableIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActiveOrderCard } from "@/components/active-orders/active-order-card";
import { ActiveOrdersTable } from "@/components/active-orders/active-orders-table";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { KitchenTicketContent } from "@/components/sales/kitchen-ticket-content";
import { SplitPaymentDialog } from "@/components/sales/split-payment-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useFeature } from "@/components/feature-gate";
import { useAuthStore } from "../../../../../store/authStore";
import { useOrderStore } from "../../../../../store/orderStore";
import { useSettingsStore } from "../../../../../store/settingsStore";
import { getTenantHeaders } from "../../../../../store/tenantHeaders";

const ORDER_TYPE_BADGE_STYLES = {
  onTable: "border border-emerald-300 bg-emerald-100 text-emerald-800",
  takeaway: "border border-blue-300 bg-blue-100 text-blue-800",
  awaitsOrder: "border border-amber-300 bg-amber-100 text-amber-800",
  default: "border border-slate-300 bg-slate-100 text-slate-700",
};

const KITCHEN_STATUS_BADGE_STYLES = {
  IN_PREPARATION: "border border-amber-300 bg-amber-100 text-amber-800",
  IN_OVEN: "border border-orange-300 bg-orange-100 text-orange-800",
  READY: "border border-emerald-300 bg-emerald-100 text-emerald-800",
};

const parseNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
};

const normalizeOrderNumber = (orderId) => {
  if (!orderId) {
    return "000";
  }
  const trimmed = String(orderId).slice(-5);
  return trimmed.padStart(3, "0");
};

const resolveProductsCount = (items = []) => {
  if (!Array.isArray(items) || items.length === 0) {
    return 0;
  }

  return items.reduce((acc, item) => acc + parseNumber(item?.quantity), 0);
};

const resolveAmount = (order) => {
  const persistedTotal = parseNumber(order?.total);
  if (persistedTotal > 0) {
    return persistedTotal;
  }

  const items = Array.isArray(order?.items) ? order.items : [];
  return items.reduce((acc, item) => {
    const totalPrice = parseNumber(item?.totalPrice);
    if (totalPrice > 0) {
      return acc + totalPrice;
    }
    const unitPrice = parseNumber(item?.unitPrice || item?.price);
    const qty = parseNumber(item?.quantity);
    return acc + unitPrice * qty;
  }, 0);
};

export default function ActiveOrdersPage() {
  const t = useTranslations("ActiveOrders");
  const hasKitchen = useFeature("kitchen");
  const params = useParams();
  const router = useRouter();
  const hydrateOrder = useOrderStore((state) => state.hydrateOrder);
  // Cancelar es solo para administracion. Esto oculta el boton; quien decide de
  // verdad es el guard de rol en POST /api/orders/[id]/cancel.
  // El dueño que entra a una sede opera como ADMIN (ver /api/auth/switch-sede).
  const isAdmin = useAuthStore(
    (state) => String(state.user?.role ?? "").toLowerCase() === "admin"
  );
  const { orderTypes, fetchSettings } = useSettingsStore((state) => ({
    orderTypes: state.orderTypes,
    fetchSettings: state.fetchSettings,
  }));

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [orderTypeFilter, setOrderTypeFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(9);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders?active=true", {
        headers: {
          ...getTenantHeaders(),
        },
      });
      const body = await response.json();
      if (!response.ok) {
        throw new Error(body?.error || t("loadError"));
      }
      setOrders(Array.isArray(body) ? body : []);
    } catch (err) {
      setError(err?.message || t("loadError"));
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  const viewOptions = [
    { value: "grid", label: t("grid"), icon: LayoutGrid },
    { value: "table", label: t("table"), icon: TableIcon },
    { value: "list", label: t("list"), icon: List },
  ];

  const orderTypeLookup = useMemo(() => {
    return (Array.isArray(orderTypes) ? orderTypes : []).reduce((acc, type) => {
      if (type?.id) {
        acc[type.id] = type.label ?? type.id;
      }
      return acc;
    }, {});
  }, [orderTypes]);

  const kitchenStatusLabels = useMemo(
    () => ({
      IN_PREPARATION: t("kitchenInPreparation"),
      IN_OVEN: t("kitchenInOven"),
      READY: t("kitchenReady"),
    }),
    [t]
  );

  const normalizedOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : []).map((order) => {
      const orderTypeId = String(order?.orderType || "takeaway");
      // Sin cocina contratada no hay estado que mostrar. Dejarlo en null apaga
      // el badge en las tres vistas, que ya son null-safe.
      const kitchenStatusId = hasKitchen ? order?.kitchenStatus || null : null;
      const tableLabel = String(order?.tableLabel ?? order?.tableId ?? "").trim();
      const orderTypeLabel =
        orderTypeId === "onTable"
          ? tableLabel
            ? `${t("tableLabel")} ${tableLabel}`
            : t("onTable")
          : orderTypeId === "takeaway"
            ? t("takeaway")
            : orderTypeId === "awaitsOrder"
              ? t("awaitsOrder")
              : orderTypeLookup[orderTypeId] ?? orderTypeId;

      const amount = resolveAmount(order);
      const amountPaid = Math.max(0, Number(order?.amountPaid || 0));
      const amountDue = Math.max(0, amount - amountPaid);
      const paymentStatus =
        order?.paymentStatus ||
        (amountPaid <= 0 ? "unpaid" : amountDue <= 0.005 ? "paid" : "partial");

      return {
        ...order,
        orderTypeId,
        orderTypeLabel,
        orderTypeBadgeClass:
          ORDER_TYPE_BADGE_STYLES[orderTypeId] ?? ORDER_TYPE_BADGE_STYLES.default,
        customerTitle: String(order?.customerName ?? "").trim() || t("withoutCustomerName"),
        productsCount: resolveProductsCount(order?.items),
        amount,
        amountPaid,
        amountDue,
        paymentStatus,
        kitchenStatusId,
        kitchenStatusLabel: kitchenStatusId ? kitchenStatusLabels[kitchenStatusId] ?? null : null,
        kitchenStatusBadgeClass: kitchenStatusId
          ? KITCHEN_STATUS_BADGE_STYLES[kitchenStatusId] ?? ORDER_TYPE_BADGE_STYLES.default
          : null,
      };
    });
  }, [orders, orderTypeLookup, kitchenStatusLabels, hasKitchen, t]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return normalizedOrders.filter((order) => {
      const matchesSearch = term
        ? [
            order.customerTitle,
            order.orderTypeLabel,
            order.tableLabel,
            order._id,
          ]
            .map((value) => String(value ?? "").toLowerCase())
            .some((value) => value.includes(term))
        : true;

      if (!matchesSearch) {
        return false;
      }

      if (orderTypeFilter === "all") {
        return true;
      }

      return order.orderTypeId === orderTypeFilter;
    });
  }, [normalizedOrders, searchTerm, orderTypeFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  useEffect(() => {
    if (page !== currentPage) {
      setPage(currentPage);
    }
  }, [currentPage, page]);

  const orderTypeOptions = useMemo(() => {
    const base = [
      { id: "onTable", label: t("onTable") },
      { id: "takeaway", label: t("takeaway") },
      { id: "awaitsOrder", label: t("awaitsOrder") },
    ];

    const configured = Array.isArray(orderTypes)
      ? orderTypes.map((type) => ({ id: type.id, label: type.label ?? type.id }))
      : [];

    const map = new Map();
    [...base, ...configured].forEach((item) => {
      if (item?.id) {
        map.set(item.id, item.label);
      }
    });

    return Array.from(map.entries()).map(([id, label]) => ({ id, label }));
  }, [orderTypes, t]);

  const formatResults = (total, term) => {
    if (!term) {
      return t("ordersCount", { total });
    }
    return t("results", { total, term });
  };

  const handleRowAction = (order) => {
    setSelectedOrder(order);
    setActionDialogOpen(true);
  };

  const selectedOrderTicket = useMemo(() => {
    if (!selectedOrder) {
      return null;
    }

    return {
      orderNumber: normalizeOrderNumber(selectedOrder?._id ?? selectedOrder?.id),
      serviceTypeValue: selectedOrder?.orderTypeLabel || selectedOrder?.orderType || "-",
      datetimeValue: new Date(selectedOrder?.createdAt ?? Date.now()).toLocaleString(),
      customerName: selectedOrder?.customerName || "",
      items: Array.isArray(selectedOrder?.items) ? selectedOrder.items : [],
      orderNotes: [],
    };
  }, [selectedOrder]);

  const handleManageOrder = useCallback(() => {
    if (!selectedOrder) {
      return;
    }

    hydrateOrder(selectedOrder);

    const locale = params?.locale;
    const tenantId = params?.tenantId;
    const orderId = selectedOrder?._id ?? selectedOrder?.id;
    const tableId = selectedOrder?.tableId;
    const orderType = selectedOrder?.orderType || "takeaway";

    const query = new URLSearchParams();
    if (orderId) {
      query.set("orderId", String(orderId));
    }
    if (orderType) {
      query.set("orderType", String(orderType));
    }
    if (tableId) {
      query.set("tableId", String(tableId));
    }

    setActionDialogOpen(false);
    router.push(`/${locale}/orders/${tenantId}?${query.toString()}`);
  }, [hydrateOrder, params?.locale, params?.tenantId, router, selectedOrder]);

  const handleCancelOrder = useCallback(async () => {
    const orderId = selectedOrder?._id ?? selectedOrder?.id;
    if (!orderId || isCancelling || !isAdmin) {
      return;
    }

    setIsCancelling(true);
    try {
      const response = await fetch(`/api/orders/${orderId}/cancel`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getTenantHeaders(),
        },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        // El 403 del guard de rol llega como "Forbidden": no sirve de nada
        // mostrarselo al cajero tal cual.
        if (response.status === 403) {
          throw new Error(t("cancelOrderForbidden"));
        }
        throw new Error(body?.error || t("cancelOrderError"));
      }

      setActionDialogOpen(false);
      setSelectedOrder(null);
      await loadOrders();
    } catch (err) {
      setError(err?.message || t("cancelOrderError"));
    } finally {
      setIsCancelling(false);
    }
  }, [isAdmin, isCancelling, loadOrders, selectedOrder, t]);

  const renderContent = () => {
    if (loading) {
      return <AppSkeleton variant={viewMode === "table" ? "table" : viewMode} />;
    }

    if (error) {
      return <AppAlert type="error" message={error} />;
    }

    if (filteredOrders.length === 0) {
      return (
        <AppAlert
          type="info"
          message={searchTerm ? t("emptyWithSearch") : t("emptyWithoutOrders")}
        />
      );
    }

    if (viewMode === "table") {
      return <ActiveOrdersTable orders={paginatedOrders} onAction={handleRowAction} />;
    }

    if (viewMode === "list") {
      return (
        <div className="space-y-3">
          {paginatedOrders.map((order) => (
            <Card key={order._id ?? order.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold">{order.customerTitle}</p>
                  <p className="text-xs text-muted-foreground">{order.orderTypeLabel}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {order.kitchenStatusLabel ? (
                    <Badge className={order.kitchenStatusBadgeClass}>
                      {order.kitchenStatusLabel}
                    </Badge>
                  ) : null}
                  <Badge className={order.orderTypeBadgeClass}>
                    {t("productsCount", { count: order.productsCount })}
                  </Badge>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">
                    {Number(order.amount || 0).toLocaleString("es-CR", {
                      style: "currency",
                      currency: "CRC",
                      maximumFractionDigits: 0,
                    })}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => handleRowAction(order)}>
                    {t("rowAction")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {paginatedOrders.map((order) => (
          <ActiveOrderCard
            key={order._id ?? order.id}
            order={order}
            onAction={handleRowAction}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-1 flex-col">
      <div className="@container/main flex flex-1 flex-col gap-4 px-4 py-6 lg:px-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold">{t("title")}</h2>
            <p className="text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>
          <Button variant="outline" onClick={loadOrders}>
            {t("refresh")}
          </Button>
        </div>

        <div className="flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t("searchByName")}
                value={searchTerm}
                onChange={(event) => {
                  setSearchTerm(event.target.value);
                  setPage(1);
                }}
              />
            </div>

            <div className="w-full max-w-xs">
              <Select
                value={orderTypeFilter}
                onValueChange={(value) => {
                  setOrderTypeFilter(value);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t("allTypes")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("all")}</SelectItem>
                  {orderTypeOptions.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs text-muted-foreground">
                {formatResults(filteredOrders.length, searchTerm)}
              </span>
              <ToggleGroup
                type="single"
                value={viewMode}
                onValueChange={(value) => value && setViewMode(value)}
                variant="outline"
                spacing={0}
              >
                {viewOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <ToggleGroupItem key={option.value} value={option.value} aria-label={option.label}>
                      <Icon className="mr-2 size-4" />
                      {option.label}
                    </ToggleGroupItem>
                  );
                })}
              </ToggleGroup>
            </div>
          </div>

          <div className="min-h-[200px]">{renderContent()}</div>

          <div className="flex flex-col items-center justify-between gap-3 border-t pt-4 sm:flex-row">
            <span className="text-xs text-muted-foreground">
              {t("pageOf", { current: currentPage, total: totalPages })}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.max(1, currentPage - 1))}
                disabled={currentPage <= 1}
              >
                {t("previous")}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage >= totalPages}
              >
                {t("next")}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog
        open={actionDialogOpen}
        onOpenChange={(open) => {
          setActionDialogOpen(open);
          if (!open) {
            setSelectedOrder(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t("actionDialogTitle", { customer: selectedOrder?.customerTitle ?? "" })}</DialogTitle>
          </DialogHeader>

          {selectedOrderTicket ? (
            <div className="space-y-4">
              <ScrollArea className="h-[40vh] w-full rounded-lg border bg-muted/30 p-4 sm:h-[420px]">
                <KitchenTicketContent
                  orderNumber={selectedOrderTicket.orderNumber}
                  serviceTypeValue={selectedOrderTicket.serviceTypeValue}
                  datetimeValue={selectedOrderTicket.datetimeValue}
                  customerName={selectedOrderTicket.customerName}
                  items={selectedOrderTicket.items}
                  orderNotes={selectedOrderTicket.orderNotes}
                />
              </ScrollArea>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={() => setActionDialogOpen(false)}>
                  {t("close")}
                </Button>
                {isAdmin ? (
                  <Button type="button" variant="destructive" onClick={handleCancelOrder} disabled={isCancelling}>
                    {isCancelling ? t("cancelling") : t("cancelOrder")}
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" onClick={() => setSplitDialogOpen(true)}>
                  {t("splitPay")}
                </Button>
                <Button type="button" onClick={handleManageOrder}>
                  {t("managePayment")}
                </Button>
              </DialogFooter>
            </div>
          ) : (
            <div className="min-h-24 rounded-md border border-dashed" />
          )}
        </DialogContent>
      </Dialog>

      <SplitPaymentDialog
        open={splitDialogOpen}
        onOpenChange={setSplitDialogOpen}
        order={selectedOrder}
        onPaid={(data) => {
          loadOrders();
          if (data?.closed) {
            setSplitDialogOpen(false);
            setActionDialogOpen(false);
            setSelectedOrder(null);
          }
        }}
      />
    </div>
  );
}

"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutGrid, List, Search, Table as TableIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { ActiveOrderCard } from "@/components/active-orders/active-order-card";
import { ActiveOrdersTable } from "@/components/active-orders/active-orders-table";
import { AppAlert } from "@/components/app-alert";
import { AppSkeleton } from "@/components/app-skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useSettingsStore } from "../../../../../store/settingsStore";
import { getTenantHeaders } from "../../../../../store/tenantHeaders";

const ORDER_TYPE_BADGE_STYLES = {
  onTable: "border border-emerald-300 bg-emerald-100 text-emerald-800",
  takeaway: "border border-blue-300 bg-blue-100 text-blue-800",
  awaitsOrder: "border border-amber-300 bg-amber-100 text-amber-800",
  default: "border border-slate-300 bg-slate-100 text-slate-700",
};

const parseNumber = (value) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
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

  const normalizedOrders = useMemo(() => {
    return (Array.isArray(orders) ? orders : []).map((order) => {
      const orderTypeId = String(order?.orderType || "takeaway");
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

      return {
        ...order,
        orderTypeId,
        orderTypeLabel,
        orderTypeBadgeClass:
          ORDER_TYPE_BADGE_STYLES[orderTypeId] ?? ORDER_TYPE_BADGE_STYLES.default,
        customerTitle: String(order?.customerName ?? "").trim() || t("withoutCustomerName"),
        productsCount: resolveProductsCount(order?.items),
        amount: resolveAmount(order),
      };
    });
  }, [orders, orderTypeLookup, t]);

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
                <Badge className={order.orderTypeBadgeClass}>
                  {t("productsCount", { count: order.productsCount })}
                </Badge>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("actionDialogTitle", { customer: selectedOrder?.customerTitle ?? "" })}</DialogTitle>
          </DialogHeader>
          <div className="min-h-24 rounded-md border border-dashed" />
        </DialogContent>
      </Dialog>
    </div>
  );
}

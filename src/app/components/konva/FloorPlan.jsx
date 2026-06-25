"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Group, Text, Layer, Stage, Rect } from "react-konva";
import { useRouter, useParams } from "next/navigation";
import Grid from "./Grid";
import TableItem from "./TableItem";
import { TableActionsPopup } from "./TableActionsPopup";
import { useTranslations } from "next-intl";
import { useThemeStore } from "../../../store/themeStore";
import { useOrderStore } from "../../../store/orderStore";
import { getTenantHeaders } from "../../../store/tenantHeaders";

export function FloorPlan({ tables, setTables, onCreateTable, onUpdateTable, canEditLayout = false }) {
  const t = useTranslations("Floor");
  const router = useRouter();
  const params = useParams();
  const [mode, setMode] = useState("operate");
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loadingActiveOrder, setLoadingActiveOrder] = useState(false);
  const { theme } = useThemeStore();
  const hydrateOrder = useOrderStore((state) => state.hydrateOrder);

  const [stageSize, setStageSize] = useState({ width: 1000, height: 700 });

  useEffect(() => {
    if (!canEditLayout && mode !== "operate") {
      setMode("operate");
    }
  }, [canEditLayout, mode]);

  useEffect(() => {
    const apply = () => setStageSize({ width: window.innerWidth, height: window.innerHeight });
    apply();

    const onResize = () => apply();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const background = theme === "dark" ? "#0b1220" : "#f8fafc";

  const onMove = async (id, pos) => {
    const previous = tables;
    setTables((prev) => prev.map((table) => (table.id === id ? { ...table, ...pos } : table)));

    try {
      await onUpdateTable?.(id, pos);
    } catch (error) {
      console.error(error?.message || "No se pudo guardar la posición de la mesa.");
      setTables(previous);
    }
  };

  const addTable = async () => {
    const newId = `t-${Date.now()}`;
    const newTable = {
      id: newId,
      name: `${t("table")} ${tables.length + 1}`,
      x: 200 + tables.length * 20,
      y: 200 + tables.length * 20,
      size: 80,
      status: "available",
    };

    setTables((prev) => [...prev, newTable]);

    try {
      await onCreateTable?.(newTable);
    } catch (error) {
      console.error(error?.message || "No se pudo crear la mesa.");
      setTables((prev) => prev.filter((table) => table.id !== newId));
    }
  };

  const handleTableClick = useCallback(async (table) => {
    if (mode !== "operate") {
      return;
    }

    setSelectedTable(table);

    if (table?.status !== "occupied") {
      setActiveOrder(null);
      return;
    }

    setLoadingActiveOrder(true);
    try {
      const response = await fetch(`/api/orders?tableId=${encodeURIComponent(table.id)}&active=true`, {
        headers: {
          ...getTenantHeaders(),
        },
      });
      if (!response.ok) {
        setActiveOrder(null);
        return;
      }
      const body = await response.json();
      setActiveOrder(body || null);
    } catch {
      setActiveOrder(null);
    } finally {
      setLoadingActiveOrder(false);
    }
  }, [mode]);

  const updateTableStatus = useCallback(async (tableId, status) => {
    const previous = tables;
    setTables((prev) => prev.map((table) => (table.id === tableId ? { ...table, status } : table)));

    try {
      await onUpdateTable?.(tableId, { status });
      setSelectedTable((prev) => (prev?.id === tableId ? { ...prev, status } : prev));
    } catch (error) {
      console.error(error?.message || "No se pudo actualizar el estado de la mesa.");
      setTables(previous);
    }
  }, [onUpdateTable, setTables, tables]);

  const handleCreateOrder = useCallback(() => {
    if (!selectedTable?.id) {
      return;
    }
    const locale = params?.locale;
    const tenantId = params?.tenantId;
    router.push(`/${locale}/orders/${tenantId}?tableId=${encodeURIComponent(selectedTable.id)}&orderType=onTable`);
  }, [params?.locale, params?.tenantId, router, selectedTable?.id]);

  const handleManagePayment = useCallback(() => {
    if (!selectedTable?.id || !activeOrder?._id) {
      return;
    }
    hydrateOrder(activeOrder);
    const locale = params?.locale;
    const tenantId = params?.tenantId;
    router.push(
      `/${locale}/orders/${tenantId}?orderId=${encodeURIComponent(activeOrder._id)}&orderType=${encodeURIComponent(activeOrder?.orderType || "onTable")}&tableId=${encodeURIComponent(selectedTable.id)}`
    );
  }, [activeOrder, hydrateOrder, params?.locale, params?.tenantId, router, selectedTable?.id]);

  const handleCloseOrder = useCallback(async () => {
    if (!activeOrder?._id || !selectedTable?.id) {
      return;
    }

    const response = await fetch(`/api/orders/${activeOrder._id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...getTenantHeaders() },
    });

    if (!response.ok) {
      return;
    }

    await updateTableStatus(selectedTable.id, "available");
    setSelectedTable(null);
    setActiveOrder(null);
  }, [activeOrder?._id, selectedTable?.id, updateTableStatus]);

  return (
    <div style={{ width: "100vw", height: "100vh", background }}>
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          <Grid width={stageSize.width} height={stageSize.height} gridSize={40} theme={theme} />
        </Layer>

        <Layer>
          {mode === "edit" && (
            <Group x={190} y={20} onClick={addTable} onTap={addTable} cursor="pointer">
              <Rect
                width={140}
                height={40}
                cornerRadius={8}
                fill={theme === "dark" ? "#1f2937" : "#e5e7eb"}
                shadowBlur={4}
              />

              <Text
                text={`+ ${t("addTable")}`}
                width={140}
                height={40}
                align="center"
                verticalAlign="middle"
                fontSize={14}
                fill={theme === "dark" ? "white" : "black"}
                listening={false}
              />
            </Group>
          )}

          {canEditLayout ? (
            <Group
              x={20}
              y={20}
              onClick={() => setMode((prev) => (prev === "edit" ? "operate" : "edit"))}
              onTap={() => setMode((prev) => (prev === "edit" ? "operate" : "edit"))}
              cursor="pointer"
            >
              <Rect
                width={160}
                height={40}
                cornerRadius={8}
                fill={mode === "edit" ? "#f59e0b" : "#10b981"}
                shadowBlur={4}
              />

              <Text
                text={mode === "edit" ? t("editMode") : t("operationMode")}
                width={160}
                height={40}
                align="center"
                verticalAlign="middle"
                fontSize={14}
                fill="white"
                listening={false}
              />
            </Group>
          ) : null}

          {tables.map((table) => (
            <TableItem
              key={table.id}
              table={table}
              onMove={onMove}
              onSelectTable={handleTableClick}
              theme={theme}
              mode={mode}
            />
          ))}
        </Layer>
      </Stage>

      <TableActionsPopup
        table={selectedTable}
        activeOrder={activeOrder}
        loadingActiveOrder={loadingActiveOrder}
        onOpenChange={(open) => {
          if (!open) {
            setSelectedTable(null);
            setActiveOrder(null);
          }
        }}
        onCreateOrder={handleCreateOrder}
        onReserveTable={() => {
          if (selectedTable?.id) {
            updateTableStatus(selectedTable.id, "reserved");
          }
        }}
        onRemoveReservation={() => {
          if (selectedTable?.id) {
            updateTableStatus(selectedTable.id, "available");
          }
        }}
        onManagePayment={handleManagePayment}
        onCloseOrder={handleCloseOrder}
      />
    </div>
  );
}

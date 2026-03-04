"use client";

import React, { useEffect, useState } from "react";
import { Group, Text, Layer, Stage, Rect } from "react-konva";
import Grid from "./Grid";
import TableItem from "./TableItem";
import { useTranslations } from "next-intl";
import { useThemeStore } from "../../../store/themeStore";

const STATUS_ORDER = ["available", "reserved", "occupied"];

function nextStatus(current) {
  const idx = STATUS_ORDER.indexOf(current);
  const nextIdx = (idx + 1) % STATUS_ORDER.length;
  return STATUS_ORDER[nextIdx];
}

export function FloorPlan({ tables, setTables, onCreateTable, onUpdateTable }) {
  const t = useTranslations("Floor");
  const [mode, setMode] = useState("edit");
  const { theme } = useThemeStore();

  const [stageSize, setStageSize] = useState({ width: 1000, height: 700 });

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

  const onToggleStatus = async (id) => {
    const previous = tables;
    const current = tables.find((table) => table.id === id);
    const next = nextStatus(current?.status);

    setTables((prev) =>
      prev.map((table) => (table.id === id ? { ...table, status: next } : table))
    );

    try {
      await onUpdateTable?.(id, { status: next });
    } catch (error) {
      console.error(error?.message || "No se pudo actualizar el estado de la mesa.");
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

          {tables.map((table) => (
            <TableItem
              key={table.id}
              table={table}
              onMove={onMove}
              onToggleStatus={onToggleStatus}
              theme={theme}
              mode={mode}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

"use client";


import React, { useEffect, useState } from "react";
import { Group, Text, Layer, Stage, Rect } from "react-konva";
import Grid from "./Grid";
import TableItem from "./TableItem";
import { useTranslations } from "next-intl";
import { useThemeStore } from "../../../store/themeStore";

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
const STATUS_ORDER = ["available", "reserved", "occupied"];

function nextStatus(current) {
  const idx = STATUS_ORDER.indexOf(current);
  const nextIdx = (idx + 1) % STATUS_ORDER.length;
  return STATUS_ORDER[nextIdx];
}

// ----------------------------------------------------
// FloorPlan Component (Stage wrapper)
// ----------------------------------------------------
export function FloorPlan({ tables, setTables }) {
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

  const onMove = (id, pos) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, ...pos } : t)));
  };

  const onToggleStatus = (id) => {
    setTables((prev) =>
      prev.map((t) => (t.id === id ? { ...t, status: nextStatus(t.status) } : t))
    );
  };

  const addTable = () => {
  const newId = `t-${Date.now()}`;

  setTables(prev => [
    ...prev,
    {
      id: newId,
      name: `${t('table')} ${prev.length + 1}`,
      x: 200 + (prev.length * 20),
      y: 200 + (prev.length * 20),
      size: 80,
      status: "available"
    }
  ]);
};

  return (
    <div style={{ width: "100vw", height: "100vh", background }}>
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          <Grid width={stageSize.width} height={stageSize.height} gridSize={40} theme={theme} />
        </Layer>

        <Layer>

          {/* Add new table */}
          {mode === "edit" && (
          <Group
            x={190}
            y={20}
            onClick={() => addTable()}
            onTap={() => addTable()}
            cursor="pointer"
          >
            <Rect
              width={140}
              height={40}
              cornerRadius={8}
              fill={theme === "dark" ? "#1f2937" : "#e5e7eb"}
              shadowBlur={4}
            />

            <Text
              text= { `+ ${t('addTable')}` }
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
          {/* Toggle Mode Button */}
          <Group
            x={20}
            y={20}
            onClick={() => setMode(prev => prev === "edit" ? "operate" : "edit")}
            onTap={() => setMode(prev => prev === "edit" ? "operate" : "edit")}
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
              text={mode === "edit" ? t('editMode') : t('operationMode')}
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

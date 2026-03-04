"use client";


import React, { useEffect, useRef, useState } from "react";
import { Group, Image, Text, Layer,Stage, Line } from "react-konva";
import useImage from "use-image";
import Konva from "konva";
// ----------------------------------------------------
// Helpers
// ----------------------------------------------------
const STATUS_ORDER = ["available", "reserved", "occupied"];

function nextStatus(current) {
  const idx = STATUS_ORDER.indexOf(current);
  const nextIdx = (idx + 1) % STATUS_ORDER.length;
  return STATUS_ORDER[nextIdx];
}

function getStatusColor(status) {
  switch (status) {
    case "available":
      return "#22c55e"; // green
    case "reserved":
      return "#eab308"; // yellow
    case "occupied":
      return "#ef4444"; // red
    default:
      return "#94a3b8"; // slate
  }
}

function getThemeFromSystem() {
  if (typeof window === "undefined") return "light";
  return window.matchMedia?.("(prefers-color-scheme: dark)")?.matches ? "dark" : "light";
}

// ----------------------------------------------------
// Grid Background
// ----------------------------------------------------
function Grid({ width, height, gridSize = 40, theme = "light" }) {
  const stroke = theme === "dark" ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const boldStroke = theme === "dark" ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.14)";

  const lines = useMemo(() => {
    const items = [];

    for (let x = 0; x <= width; x += gridSize) {
      const isBold = x % (gridSize * 5) === 0;
      items.push(
        <Line
          key={`vx-${x}`}
          points={[x, 0, x, height]}
          stroke={isBold ? boldStroke : stroke}
          strokeWidth={1}
          listening={false}
        />
      );
    }

    for (let y = 0; y <= height; y += gridSize) {
      const isBold = y % (gridSize * 5) === 0;
      items.push(
        <Line
          key={`hy-${y}`}
          points={[0, y, width, y]}
          stroke={isBold ? boldStroke : stroke}
          strokeWidth={1}
          listening={false}
        />
      );
    }

    return items;
  }, [width, height, gridSize, stroke, boldStroke]);

  return <>{lines}</>;
}

// ----------------------------------------------------
// Single Table Component
// ----------------------------------------------------

function TableItem({ table, onMove, onToggleStatus, theme }) {
  const [image] = useImage("/dinner.svg");
  const imageRef = useRef();

  const statusColor = getStatusColor(table.status);

  const labelColor =
    theme === "dark"
      ? "rgba(255,255,255,0.9)"
      : "rgba(0,0,0,0.9)";

  // 🔥 ESTA PARTE ES LA CLAVE
  useEffect(() => {
    if (imageRef.current) {
      imageRef.current.cache();
      imageRef.current.getLayer().batchDraw();
    }
  }, [image, table.status]);

  return (
    <Group
      x={table.x}
      y={table.y}
      draggable
      onDragEnd={(e) =>
        onMove(table.id, {
          x: e.target.x(),
          y: e.target.y(),
        })
      }
      onClick={() => onToggleStatus(table.id)}
      onTap={() => onToggleStatus(table.id)}
    >
      <Image
        ref={imageRef}
        image={image}
        width={table.size}
        height={table.size}
        filters={[Konva.Filters.RGBA]}
        red={parseInt(statusColor.slice(1, 3), 16)}
        green={parseInt(statusColor.slice(3, 5), 16)}
        blue={parseInt(statusColor.slice(5, 7), 16)}
      />

      <Text
        text={table.name}
        y={table.size + 6}
        width={table.size}
        align="center"
        fontSize={12}
        fill={labelColor}
        listening={false}
      />
    </Group>
  );
}
// ----------------------------------------------------
// FloorPlan Component (Stage wrapper)
// ----------------------------------------------------
export function FloorPlan({ tables, setTables }) {
  const [stageSize, setStageSize] = useState({ width: 1000, height: 700 });
  const [theme, setTheme] = useState("light");

  useEffect(() => {
    const apply = () => setStageSize({ width: window.innerWidth, height: window.innerHeight });
    apply();

    const onResize = () => apply();
    window.addEventListener("resize", onResize);

    // theme
    const initialTheme = getThemeFromSystem();
    setTheme(initialTheme);

    const mq = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onThemeChange = () => setTheme(mq.matches ? "dark" : "light");
    mq?.addEventListener?.("change", onThemeChange);

    return () => {
      window.removeEventListener("resize", onResize);
      mq?.removeEventListener?.("change", onThemeChange);
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

  return (
    <div style={{ width: "100vw", height: "100vh", background }}>
      <Stage width={stageSize.width} height={stageSize.height}>
        <Layer>
          <Grid width={stageSize.width} height={stageSize.height} gridSize={40} theme={theme} />
        </Layer>

        <Layer>
          <Text
            text="Floor Demo: click a table to change status, drag to move"
            x={16}
            y={14}
            fontSize={14}
            fill={theme === "dark" ? "rgba(255,255,255,0.8)" : "rgba(0,0,0,0.75)"}
            listening={false}
          />

          {tables.map((table) => (
            <TableItem
              key={table.id}
              table={table}
              onMove={onMove}
              onToggleStatus={onToggleStatus}
              theme={theme}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}
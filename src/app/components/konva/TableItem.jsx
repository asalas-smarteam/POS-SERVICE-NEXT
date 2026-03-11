"use client";

import React, { useEffect, useRef } from "react";
import { Group, Image, Text } from "react-konva";
import useImage from "use-image";
import Konva from "konva";

function getStatusColor(status) {
  switch (status) {
    case "available":
      return "#22c55e";
    case "reserved":
      return "#eab308";
    case "occupied":
      return "#ef4444";
    default:
      return "#94a3b8";
  }
}

export default function TableItem({ table, onMove, onSelectTable, theme, mode }) {
  const [image] = useImage("/dinner.svg");
  const imageRef = useRef();

  const statusColor = getStatusColor(table.status);
  const labelColor = theme === "dark" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)";

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
      draggable={mode === "edit"}
      onDragEnd={(e) =>
        onMove(table.id, {
          x: e.target.x(),
          y: e.target.y(),
        })
      }
      onClick={() => {
        if (mode === "operate") {
          onSelectTable?.(table);
        }
      }}
      onTap={() => {
        if (mode === "operate") {
          onSelectTable?.(table);
        }
      }}
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

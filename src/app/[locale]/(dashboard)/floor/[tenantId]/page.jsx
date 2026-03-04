"use client";
import React, { useState } from "react";
import { FloorPlan } from "@/components/konva/componentes";


export default function FloorGridPage() {
 
  const [tables, setTables] = useState([
    { id: "t1", name: "Mesa 1", x: 120, y: 120, size: 80, status: "available" },
    { id: "t2", name: "Mesa 2", x: 260, y: 140, size: 80, status: "reserved" },
    { id: "t3", name: "Mesa 3", x: 420, y: 160, size: 80, status: "occupied" },
    { id: "t4", name: "Mesa 4", x: 180, y: 300, size: 96, status: "available" },
  ]);

  return <FloorPlan tables={tables} setTables={setTables} />;

}

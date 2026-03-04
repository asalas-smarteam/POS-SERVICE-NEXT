"use client";
import React, { useState } from "react";
import { FloorPlan } from "@/components/konva/FloorPlan";

export default function FloorGridPage() {

  const [tables, setTables] = useState([]);

  return (
    <FloorPlan
      tables={tables}
      setTables={setTables}
    />
  );
}
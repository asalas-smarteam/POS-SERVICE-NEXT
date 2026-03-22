"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FloorPlan } from "@/components/konva/FloorPlan";
import { getTenantHeaders } from "../../../../../store/tenantHeaders";
import { useAuthStore } from "../../../../../store/authStore";

export default function FloorGridPage() {
  const [tables, setTables] = useState([]);
  const userRole = useAuthStore((state) => state.user?.role);
  const canEditLayout = String(userRole || "").toUpperCase() === "ADMIN";

  const fetchTables = useCallback(async () => {
    try {
      const response = await fetch("/api/tables", {
        headers: {
          ...getTenantHeaders(),
        },
      });

      if (!response.ok) {
        throw new Error("No se pudieron cargar las mesas.");
      }

      const data = await response.json();
      setTables(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error?.message || "Error al cargar mesas.");
      setTables([]);
    }
  }, []);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  const createTable = useCallback(async (newTable) => {
    const response = await fetch("/api/tables", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getTenantHeaders(),
      },
      body: JSON.stringify(newTable),
    });

    if (!response.ok) {
      throw new Error("No se pudo crear la mesa.");
    }

    return response.json();
  }, []);

  const updateTable = useCallback(async (id, payload) => {
    const response = await fetch(`/api/tables/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        ...getTenantHeaders(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error("No se pudo actualizar la mesa.");
    }

    return response.json();
  }, []);

  return (
    <FloorPlan
      tables={tables}
      setTables={setTables}
      onCreateTable={createTable}
      onUpdateTable={updateTable}
      canEditLayout={canEditLayout}
    />
  );
}

// Ocupacion y liberacion de mesas.
//
// Todas las escrituras a Table estan condicionadas a que la orden tenga un
// tableId real, no a que el tenant tenga el modulo /floor. Una cuenta sin floor
// marca sus ordenes como "en mesa" con una etiqueta libre y tableId null, asi
// que estas funciones se vuelven no-op solas sin que cada endpoint tenga que
// preguntar por el feature.

import { TableModel } from "@/models/tenant/Table";

function tableError(message) {
  const error = new Error(message);
  error.status = 400;
  return error;
}

/**
 * Resuelve como queda identificada la mesa de una orden `onTable`.
 *
 * Con el modulo /floor contratado la mesa es una fila real de Table, elegida
 * del plano, y se le sigue el estado (ocupada/libre). Sin el modulo el cliente
 * igual puede marcar la orden como "en mesa": escribe una etiqueta libre y la
 * orden queda con tableId null, que es lo que hace que occupy/release se
 * vuelvan no-op mas abajo.
 *
 * Lanza un error con status 400 si falta el dato obligatorio de cada modo.
 */
export async function resolveTableReference({
  conn,
  hasFloor,
  incomingTableId,
  incomingTableLabel,
  currentTableId,
  currentTableLabel,
}) {
  const label = (incomingTableLabel || currentTableLabel || "").trim();

  if (!hasFloor) {
    if (!label) {
      throw tableError("A table label is required for onTable orders.");
    }
    return { tableId: null, tableLabel: label };
  }

  const resolvedTableId = (incomingTableId || currentTableId || "").trim();
  if (!resolvedTableId) {
    throw tableError("tableId is required for onTable orders.");
  }

  const Table = TableModel(conn);
  const table = await Table.findOne({ id: resolvedTableId }).lean();
  if (!table) {
    throw tableError("Selected table not found.");
  }

  return { tableId: table.id, tableLabel: label || table.name || null };
}

const isTableBackedOrder = (order) =>
  order?.orderType === "onTable" && Boolean(order?.tableId);

export async function occupyOrderTable(conn, order) {
  if (!isTableBackedOrder(order)) {
    return;
  }

  const Table = TableModel(conn);
  await Table.findOneAndUpdate(
    { id: order.tableId },
    { status: "occupied" },
    { new: false }
  );
}

export async function releaseOrderTable(conn, order) {
  if (!isTableBackedOrder(order)) {
    return;
  }

  const Table = TableModel(conn);
  await Table.findOneAndUpdate(
    { id: order.tableId },
    { status: "available" },
    { new: false }
  );
}

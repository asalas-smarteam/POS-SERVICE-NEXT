import { NextResponse } from 'next/server';
import { requireModuleAccess } from '@/lib/security/featureAccess';
import { getTenantConnection } from '@/lib/db/connections';
import { TableModel } from '@/models/tenant/Table';

const TABLE_STATUSES = ['available', 'reserved', 'occupied'];

function buildUpdatePayload(body = {}) {
  const payload = {};

  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim() === '') {
      return { error: 'Table name is invalid.' };
    }
    payload.name = body.name.trim();
  }

  if (body.x !== undefined) {
    if (typeof body.x !== 'number' || Number.isNaN(body.x)) {
      return { error: 'Table x is invalid.' };
    }
    payload.x = body.x;
  }

  if (body.y !== undefined) {
    if (typeof body.y !== 'number' || Number.isNaN(body.y)) {
      return { error: 'Table y is invalid.' };
    }
    payload.y = body.y;
  }

  if (body.size !== undefined) {
    if (typeof body.size !== 'number' || Number.isNaN(body.size) || body.size <= 0) {
      return { error: 'Table size is invalid.' };
    }
    payload.size = body.size;
  }

  if (body.status !== undefined) {
    if (!TABLE_STATUSES.includes(body.status)) {
      return { error: 'Table status is invalid.' };
    }
    payload.status = body.status;
  }

  if (!Object.keys(payload).length) {
    return { error: 'No valid fields to update.' };
  }

  return { payload };
}

export async function PATCH(req, { params }) {
  try {
    const { tenant } = await requireModuleAccess(req, 'floor');
    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'Table id is required.' }, { status: 400 });
    }

    const body = await req.json();
    const { payload, error } = buildUpdatePayload(body);

    if (error) {
      return NextResponse.json({ error }, { status: 400 });
    }

    const conn = await getTenantConnection(tenant.dbName);
    const Table = TableModel(conn);

    const updated = await Table.findOneAndUpdate({ id }, payload, {
      new: true,
      runValidators: true,
      projection: { _id: 0, __v: 0 },
    });

    if (!updated) {
      return NextResponse.json({ error: 'Table not found.' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
}

import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { authorizeRequest } from '@/lib/security/authorizeRequest';
import { getTenantConnection } from '@/lib/db/connections';
import { TableModel } from '@/models/tenant/Table';

const TABLE_STATUSES = ['available', 'reserved', 'occupied'];

function validateTablePayload(payload = {}) {
  if (typeof payload.id !== 'string' || payload.id.trim() === '') {
    return 'Table id is required.';
  }

  if (typeof payload.name !== 'string' || payload.name.trim() === '') {
    return 'Table name is required.';
  }

  if (typeof payload.x !== 'number' || Number.isNaN(payload.x)) {
    return 'Table x must be a valid number.';
  }

  if (typeof payload.y !== 'number' || Number.isNaN(payload.y)) {
    return 'Table y must be a valid number.';
  }

  if (typeof payload.size !== 'number' || Number.isNaN(payload.size) || payload.size <= 0) {
    return 'Table size must be a valid number greater than 0.';
  }

  if (!TABLE_STATUSES.includes(payload.status)) {
    return 'Table status is invalid.';
  }

  return null;
}

export async function GET(req) {
  try {
    await authorizeRequest(req, 'floor');
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Table = TableModel(conn);

    const tables = await Table.find({}, { _id: 0, __v: 0 }).sort({ createdAt: 1 });

    return NextResponse.json(tables);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    await authorizeRequest(req, 'floor');
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Table = TableModel(conn);

    const body = await req.json();
    const validationError = validateTablePayload(body);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const existing = await Table.findOne({ id: body.id });
    if (existing) {
      return NextResponse.json({ error: 'Table id already exists.' }, { status: 409 });
    }

    const created = await Table.create({
      id: body.id,
      name: body.name.trim(),
      x: body.x,
      y: body.y,
      size: body.size,
      status: body.status,
    });

    return NextResponse.json(
      {
        id: created.id,
        name: created.name,
        x: created.x,
        y: created.y,
        size: created.size,
        status: created.status,
      },
      { status: 201 }
    );
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { IngredientModel } from '@/models/tenant/Ingredient';

export async function POST(req) {
  try {
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Ingredient = IngredientModel(conn);

    const body = await req.json();
    const ingredient = await Ingredient.create(body);

    return NextResponse.json(ingredient);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Ingredient = IngredientModel(conn);

    const list = await Ingredient.find();
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';
import { IngredientModel } from '@/models/tenant/Ingredient';

export async function POST(req) {
  try {
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    IngredientModel(conn);
    const Product = ProductModel(conn);

    const body = await req.json();
    const product = await Product.create(body);

    return NextResponse.json(product);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function GET(req) {
  try {
    debugger;
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    IngredientModel(conn);
    const Product = ProductModel(conn);

    const list = await Product.find().populate('ingredients.ingredientId');
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}


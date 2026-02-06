import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';
import { IngredientModel } from '@/models/tenant/Ingredient';

export async function PUT(req, { params }) {
  try {
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    IngredientModel(conn);
    const Product = ProductModel(conn);

    const body = await req.json();
    if (body?.categoryId !== undefined && body?.categoryId !== null && typeof body.categoryId !== "string") {
      return NextResponse.json({ error: "categoryId debe ser un string." }, { status: 400 });
    }
    if (typeof body?.categoryId === "string" && body.categoryId.trim() === "") {
      body.categoryId = null;
    }
    const updated = await Product.findByIdAndUpdate(orderId, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const populated = await Product.findById(updated._id).populate('ingredients.ingredientId');
    return NextResponse.json(populated);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

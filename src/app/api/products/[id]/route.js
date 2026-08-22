import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { authorizeRequest } from '@/lib/security/authorizeRequest';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';
import { IngredientModel } from '@/models/tenant/Ingredient';
import { pickProductFields } from '@/lib/products/productFields';

export async function PUT(req, { params }) {
  try {
    const { id: orderId } = await params;

    if (!orderId) {
      return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    await authorizeRequest(req, 'products');
    const conn = await getTenantConnection(tenant.dbName);
    IngredientModel(conn);
    const Product = ProductModel(conn);

    const body = await req.json();
    const fields = pickProductFields(body);

    if (fields.categoryId !== undefined && fields.categoryId !== null && typeof fields.categoryId !== "string") {
      return NextResponse.json({ error: "categoryId debe ser un string." }, { status: 400 });
    }
    if (typeof fields.categoryId === "string" && fields.categoryId.trim() === "") {
      fields.categoryId = null;
    }

    const updated = await Product.findByIdAndUpdate(orderId, fields, {
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

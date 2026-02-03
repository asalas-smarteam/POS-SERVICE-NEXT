import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';

export async function PUT(req, { params }) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'Product id is required.' }, { status: 400 });
    }

    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const Product = ProductModel(conn);

    const body = await req.json();
    const updated = await Product.findByIdAndUpdate(id, body, {
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

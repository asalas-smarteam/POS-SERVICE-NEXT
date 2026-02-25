import { NextResponse } from 'next/server';
import { resolveTenant } from '@/lib/tenant/resolveTenant';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductSizeModel } from '@/models/tenant/ProductSize';

export async function GET(req) {
  try {
    const tenant = await resolveTenant(req);
    const conn = await getTenantConnection(tenant.dbName);
    const ProductSize = ProductSizeModel(conn);

    const sizes = await ProductSize.find().sort({ isDefault: -1, name: 1 });

    return NextResponse.json({
      success: true,
      data: Array.isArray(sizes) ? sizes : [],
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch product sizes.',
      },
      { status: 500 }
    );
  }
}

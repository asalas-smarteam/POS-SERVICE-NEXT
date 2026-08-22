import { NextResponse } from 'next/server';
import { requireModuleAccess } from '@/lib/security/featureAccess';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';
import { getStorage } from '@/lib/storage';
import { buildProductImageKey } from '@/lib/storage/storageKeys';
import { ImageValidationError, validateImageBuffer } from '@/lib/storage/imageValidation';

const errorStatus = (error) => {
  if (error instanceof ImageValidationError) {
    return error.status;
  }
  return error?.status ?? 500;
};

// Un borrado fallido deja un huerfano; abortar la operacion dejaria al producto
// apuntando a un archivo que ya no queremos. El huerfano es el menor de los dos
// males, asi que se registra y se sigue.
async function removeQuietly(storage, image) {
  if (!image) {
    return;
  }

  try {
    await storage.remove(image);
  } catch (error) {
    console.warn('No se pudo borrar el archivo anterior', image.pathname, error);
  }
}

const previousImageOf = (product) =>
  product?.image?.pathname
    ? { url: product.image.url, pathname: product.image.pathname }
    : null;

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { tenant } = await requireModuleAccess(req, 'products');
    const conn = await getTenantConnection(tenant.dbName);
    const Product = ProductModel(conn);

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const formData = await req.formData();
    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'file is required.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const { format, width, height, contentType } = validateImageBuffer(buffer);

    const key = buildProductImageKey({
      tenantId: tenant.tenantId,
      productId: String(product._id),
      format,
    });

    const storage = getStorage();
    const stored = await storage.put(buffer, { key, contentType });
    const previous = previousImageOf(product);

    const updated = await Product.findByIdAndUpdate(
      product._id,
      { $set: { image: { url: stored.url, pathname: stored.pathname, width, height } } },
      { new: true, runValidators: true },
    );

    await removeQuietly(storage, previous);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const { tenant } = await requireModuleAccess(req, 'products');
    const conn = await getTenantConnection(tenant.dbName);
    const Product = ProductModel(conn);

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    const previous = previousImageOf(product);

    // Idempotente: sobre un producto sin foto no hay nada que borrar.
    if (!previous) {
      return NextResponse.json(product);
    }

    const updated = await Product.findByIdAndUpdate(
      product._id,
      { $unset: { image: 1 } },
      { new: true },
    );

    await removeQuietly(getStorage(), previous);

    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: errorStatus(error) });
  }
}

import { NextResponse } from 'next/server';
import { requireModuleAccess } from '@/lib/security/featureAccess';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';
import { getStorage } from '@/lib/storage';
import { buildProductImageKey } from '@/lib/storage/storageKeys';
import { ImageValidationError, MAX_BYTES, validateImageBuffer } from '@/lib/storage/imageValidation';

// Mismo patron que buildProductImageKey usa para productId: valida la forma
// del id ANTES de tocar la base, asi un id invalido nunca llega a disparar un
// CastError de mongoose (que devolveria 500 y nombraria el modelo en el mensaje).
const OBJECT_ID_PATTERN = /^[0-9a-f]{24}$/i;

const errorStatus = (error) => {
  if (error instanceof ImageValidationError) {
    return error.status;
  }
  return error?.status ?? 500;
};

// Los mensajes de error interno (fs, driver de storage, etc.) pueden traer
// rutas absolutas del filesystem o detalles de configuracion. Solo se
// enmascaran cuando el status es 500: los 400/403/404/413 son deliberados y
// utiles para el cliente.
const errorMessage = (status, error) =>
  status === 500 ? 'Failed to process product image' : error.message;

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
    if (!OBJECT_ID_PATTERN.test(String(id ?? ''))) {
      return NextResponse.json({ error: 'Invalid product id.' }, { status: 400 });
    }

    const { tenant } = await requireModuleAccess(req, 'products');
    const conn = await getTenantConnection(tenant.dbName);
    const Product = ProductModel(conn);

    const product = await Product.findById(id);
    if (!product) {
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    // Content-Length llega antes de leer un solo byte del body. Chequearlo
    // aqui evita materializar un body gigante en memoria solo para
    // descubrir, recien despues de bufferearlo, que excede el limite. No
    // reemplaza el chequeo de mas abajo: si el header falta o no es un
    // numero, seguimos y confiamos en el tamaño real del archivo.
    const contentLength = Number(req.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
    }

    // req.formData() rechaza (TypeError, sin .status) cualquier body que no sea
    // multipart: JSON, vacio, etc. Es un error del cliente, no del servidor.
    let formData;
    try {
      formData = await req.formData();
    } catch {
      return NextResponse.json({ error: 'Request body must be multipart/form-data.' }, { status: 400 });
    }

    const file = formData.get('file');
    if (!file || typeof file.arrayBuffer !== 'function') {
      return NextResponse.json({ error: 'file is required.' }, { status: 400 });
    }

    // Mismo limite que validateImageBuffer, chequeado antes de copiar el
    // archivo entero a un Buffer con arrayBuffer(). El Content-Length de
    // arriba puede faltar o venir mal formado; file.size no depende de eso.
    if (typeof file.size === 'number' && file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'File too large' }, { status: 413 });
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

    // Si la escritura en base falla (o el producto desaparecio entre el read
    // y el update), el archivo recien escrito queda sin nada que lo
    // referencie: hay que borrarlo. removeQuietly nunca lanza, asi que un
    // fallo al limpiar no tapa el error original (o el 404).
    let updated;
    try {
      updated = await Product.findByIdAndUpdate(
        product._id,
        { $set: { image: { url: stored.url, pathname: stored.pathname, width, height } } },
        { new: true, runValidators: true },
      );
    } catch (error) {
      await removeQuietly(storage, stored);
      throw error;
    }

    if (!updated) {
      await removeQuietly(storage, stored);
      return NextResponse.json({ error: 'Product not found.' }, { status: 404 });
    }

    await removeQuietly(storage, previous);

    return NextResponse.json(updated);
  } catch (error) {
    const status = errorStatus(error);
    return NextResponse.json({ error: errorMessage(status, error) }, { status });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    if (!OBJECT_ID_PATTERN.test(String(id ?? ''))) {
      return NextResponse.json({ error: 'Invalid product id.' }, { status: 400 });
    }

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
    const status = errorStatus(error);
    return NextResponse.json({ error: errorMessage(status, error) }, { status });
  }
}

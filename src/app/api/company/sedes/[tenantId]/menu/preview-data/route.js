import { NextResponse } from 'next/server';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { getTenantConnection } from '@/lib/db/connections';
import { ProductModel } from '@/models/tenant/Product';
import { getProductCategories } from '@/lib/tenant/categorySettings';
import { getProductSizes } from '@/lib/tenant/productSizeSettings';
import { getSystemSettings } from '@/lib/tenant/systemSettings';
import { MAX_MENU_PRODUCTS } from '@/lib/menu/menuLimits';

// Datos crudos para la vista previa del editor. Devuelve TODAS las categorias
// activas y no solo las que hoy son bloque: la lista del lienzo cambia en vivo,
// y si esto dependiera de que categorias estan puestas, agregar una obligaria a
// un refetch y la previa saltaria en cada agregado.
//
// Todo sale como arreglo, nunca como Map: JSON no transporta Map. El cliente
// arma los Map que MenuBlockList espera.
export async function GET(req, { params }) {
  try {
    const { tenantId } = await params;
    const { sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    const conn = await getTenantConnection(sede.dbName);
    const [categoryRows, sizeRows, settings] = await Promise.all([
      getProductCategories(conn),
      getProductSizes(conn),
      getSystemSettings(conn),
    ]);

    // Estricto (=== true), igual que renderableBlocks y que el endpoint de
    // categorias. Si aca apareciera una categoria que el renderizador despues
    // descarta, la previa mostraria una seccion que el menu publico no tiene.
    const categories = categoryRows
      .filter((row) => row?.id && row.active === true)
      .map((row) => ({
        id: String(row.id),
        label: row.label ?? String(row.id),
        hasSizes: row.hasSizes === true,
      }));

    const categoryIds = categories.map((category) => category.id);

    // limit + 1 para poder distinguir "500 justos" de "hay mas": una previa
    // recortada que no lo dice es una previa que miente.
    const rows = categoryIds.length
      ? await ProductModel(conn)
          .find({ categoryId: { $in: categoryIds } })
          .select('name price description image categoryId productSizeId')
          .sort({ name: 1 })
          .limit(MAX_MENU_PRODUCTS + 1)
          .lean()
      : [];

    const truncated = rows.length > MAX_MENU_PRODUCTS;

    const products = rows.slice(0, MAX_MENU_PRODUCTS).map((row) => ({
      id: String(row._id),
      categoryId: String(row.categoryId ?? ''),
      name: row.name,
      price: row.price,
      description: row.description || '',
      image: row.image?.url ? { url: row.image.url } : null,
      sizeId: row.productSizeId ? String(row.productSizeId) : null,
    }));

    // El orden es la posicion en el arreglo ya filtrado, exactamente como lo
    // calcula getProductSizeOrderMap para la pagina publica.
    const sizes = sizeRows.map((row, index) => ({
      id: String(row.id),
      label: typeof row.label === 'string' ? row.label : '',
      order: index,
    }));

    return NextResponse.json({
      categories,
      products,
      sizes,
      currency: settings?.currency ?? null,
      truncated,
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to load preview data' : error.message },
      { status },
    );
  }
}

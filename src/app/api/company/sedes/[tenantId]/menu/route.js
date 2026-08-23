import { NextResponse } from 'next/server';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { getTenantConnection } from '@/lib/db/connections';
import { normalizeMenuDraft } from '@/lib/menu/menuSchema';
import { readMenuDocument, writeMenuDocument } from '@/lib/menu/menuSettings';

function sedeSummary(sede) {
  return {
    tenantId: sede.tenantId,
    name: sede.name,
    sedeLabel: sede.sedeLabel || null,
  };
}

const errorResponse = (error, fallback) => {
  const status = error?.status || 500;
  return NextResponse.json(
    { error: status === 500 ? fallback : error.message },
    { status },
  );
};

export async function GET(req, { params }) {
  try {
    const { tenantId } = await params;
    const { sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    const conn = await getTenantConnection(sede.dbName);
    const menu = await readMenuDocument(conn);

    return NextResponse.json({
      tenant: sedeSummary(sede),
      menuSlug: sede.menuSlug || '',
      menu,
    });
  } catch (error) {
    return errorResponse(error, 'Failed to load menu');
  }
}

// Guarda solo el borrador. El slug se mueve por PUT /menu/slug, en su propia
// ruta: mezclarlos obligaba a distinguir "menuSlug ausente" de "menuSlug vacio"
// en cada llamada del autoguardado, y equivocarse en esa distincion mueve una
// URL publica sin que nadie lo haya pedido. Un QR impreso no se reemite.
//
// Tampoco revalida: la pagina publica renderiza menu.published, asi que guardar
// un borrador no cambia una sola respuesta cacheada. Revalidar en cada pausa de
// tecleo tiraria la cache de un menu que no cambio.
export async function PUT(req, { params }) {
  try {
    const { tenantId } = await params;
    const { sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    const body = await req.json().catch(() => ({}));

    const conn = await getTenantConnection(sede.dbName);
    const current = await readMenuDocument(conn);
    const saved = await writeMenuDocument(conn, {
      ...current,
      draft: normalizeMenuDraft(body?.draft),
    });

    return NextResponse.json({ tenant: sedeSummary(sede), menu: saved });
  } catch (error) {
    return errorResponse(error, 'Failed to save menu');
  }
}

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { getTenantConnection } from '@/lib/db/connections';
import { MENU_SLUG_ERRORS, normalizeMenuSlug, validateMenuSlug } from '@/lib/menu/menuSlug';
import { normalizeMenuDraft, normalizeMenuDocument } from '@/lib/menu/menuSchema';
import { assignMenuSlug } from '@/lib/menu/menuTenant';
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

// Mapa explicito: assignMenuSlug puede fallar por mas de un motivo y cada uno
// pesa distinto en HTTP. Un codigo nuevo que no se agregue aqui cae al 500 (y
// se enmascara abajo), en vez de heredar el 409 de slug_taken sin que aplique.
const SLUG_ASSIGN_ERROR_STATUS = Object.freeze({
  [MENU_SLUG_ERRORS.TAKEN]: 409, // otra sede ya tiene ese slug (indice unico)
  [MENU_SLUG_ERRORS.INVALID]: 400, // slug normalizado vacio, nunca se escribio
  tenant_not_found: 404, // el update no encontro el tenantId
});

function statusForSlugAssignError(code) {
  return SLUG_ASSIGN_ERROR_STATUS[code] || 500;
}

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

export async function PUT(req, { params }) {
  try {
    const { tenantId } = await params;
    const { masterConn, sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    const body = await req.json().catch(() => ({}));

    const slugError = validateMenuSlug(body?.menuSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    // Orden deliberado: primero el borrador (base de datos de la sede),
    // despues el slug (master), y la revalidacion al final, solo si ambas
    // escrituras salieron bien. Antes era slug -> revalidate -> draft: si el
    // draft fallaba despues de mover el slug, la respuesta era un 500 pero el
    // slug publico ya habia cambiado — un QR impreso con el slug viejo queda
    // 404 para siempre y el dueno, viendo el error, cree que no paso nada. Con
    // este orden, si el draft falla, el slug no se toco: el dueno recarga, ve
    // el slug de siempre y puede reintentar sin que ningun QR se rompa. Si en
    // cambio el draft se guarda pero el slug falla (por ejemplo slug_taken),
    // el borrador queda guardado y el slug tampoco cambio: se puede reintentar
    // solo la parte del slug sin perder lo que ya se escribio.
    const conn = await getTenantConnection(sede.dbName);
    const current = await readMenuDocument(conn);
    const saved = await writeMenuDocument(conn, {
      ...current,
      draft: normalizeMenuDraft(body?.draft),
    });

    const assigned = await assignMenuSlug(masterConn, sede.tenantId, body.menuSlug);
    if (!assigned.ok) {
      const status = statusForSlugAssignError(assigned.error);
      return NextResponse.json(
        { error: status === 500 ? 'Failed to save menu' : assigned.error },
        { status },
      );
    }

    // El slug viejo queda apuntando a una ruta que ya no existe: si no se
    // revalida, sigue sirviendo el menu desde la cache. Se revalida solo
    // despues de que el draft y el slug quedaron escritos: revalidar antes
    // dejaria una ruta publica "fresca" apuntando a datos que todavia podrian
    // no haberse guardado.
    const previousSlug = sede.menuSlug || '';
    const nextSlug = normalizeMenuSlug(body.menuSlug);
    if (previousSlug && previousSlug !== nextSlug) {
      revalidatePath(`/m/${previousSlug}`);
    }
    revalidatePath(`/m/${nextSlug}`);

    return NextResponse.json({
      tenant: sedeSummary(sede),
      menuSlug: nextSlug,
      menu: normalizeMenuDocument(saved),
    });
  } catch (error) {
    return errorResponse(error, 'Failed to save menu');
  }
}

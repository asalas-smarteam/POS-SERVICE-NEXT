import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { MENU_SLUG_ERRORS, normalizeMenuSlug, validateMenuSlug } from '@/lib/menu/menuSlug';
import { assignMenuSlug } from '@/lib/menu/menuTenant';

// Mapa explicito: assignMenuSlug puede fallar por mas de un motivo y cada uno
// pesa distinto en HTTP. Un codigo nuevo que no se agregue aqui cae al 500 (y
// se enmascara abajo), en vez de heredar el 409 de slug_taken sin que aplique.
const SLUG_ASSIGN_ERROR_STATUS = Object.freeze({
  [MENU_SLUG_ERRORS.TAKEN]: 409,
  [MENU_SLUG_ERRORS.INVALID]: 400,
  tenant_not_found: 404,
});

function statusForSlugAssignError(code) {
  return SLUG_ASSIGN_ERROR_STATUS[code] || 500;
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

    const assigned = await assignMenuSlug(masterConn, sede.tenantId, body.menuSlug);
    if (!assigned.ok) {
      const status = statusForSlugAssignError(assigned.error);
      return NextResponse.json(
        { error: status === 500 ? 'Failed to save link' : assigned.error },
        { status },
      );
    }

    // El slug viejo queda apuntando a una ruta que ya no existe: si no se
    // revalida, sigue sirviendo el menu desde la cache.
    const previousSlug = sede.menuSlug || '';
    const nextSlug = normalizeMenuSlug(body.menuSlug);
    if (previousSlug && previousSlug !== nextSlug) {
      revalidatePath(`/m/${previousSlug}`);
    }
    revalidatePath(`/m/${nextSlug}`);

    return NextResponse.json({ menuSlug: nextSlug });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to save link' : error.message },
      { status },
    );
  }
}

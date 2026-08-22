import { NextResponse } from 'next/server';
import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { getTenantConnection } from '@/lib/db/connections';
import { TenantModel } from '@/models/master/Tenant';
import { hasFeature } from '@/lib/features/featureRegistry';
import { MENU_SLUG_ERRORS, normalizeMenuSlug, validateMenuSlug } from '@/lib/menu/menuSlug';
import { normalizeMenuDraft, normalizeMenuDocument } from '@/lib/menu/menuSchema';
import { assignMenuSlug } from '@/lib/menu/menuTenant';
import { readMenuDocument, writeMenuDocument } from '@/lib/menu/menuSettings';

// El token del dueño no lleva tenantId, asi que la pertenencia de la sede se
// verifica siempre contra el master y nunca contra un dato del cliente.
async function resolveOwnerSede(masterConn, companyId, tenantId) {
  const Tenant = TenantModel(masterConn);
  return Tenant.findOne({
    tenantId: String(tenantId),
    companyId,
    status: 'active',
  }).lean();
}

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
    const { companyId } = await getOwnerContext(req);
    const { tenantId } = await params;

    const masterConn = await connectMasterDB();
    const sede = await resolveOwnerSede(masterConn, companyId, tenantId);
    if (!sede) {
      return NextResponse.json({ error: 'Sede not available' }, { status: 403 });
    }
    if (!hasFeature(sede.features, 'online-menu')) {
      return NextResponse.json({ error: 'feature_not_included' }, { status: 403 });
    }

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
    const { companyId } = await getOwnerContext(req);
    const { tenantId } = await params;

    const masterConn = await connectMasterDB();
    const sede = await resolveOwnerSede(masterConn, companyId, tenantId);
    if (!sede) {
      return NextResponse.json({ error: 'Sede not available' }, { status: 403 });
    }
    if (!hasFeature(sede.features, 'online-menu')) {
      return NextResponse.json({ error: 'feature_not_included' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));

    const slugError = validateMenuSlug(body?.menuSlug);
    if (slugError) {
      return NextResponse.json({ error: slugError }, { status: 400 });
    }

    const assigned = await assignMenuSlug(masterConn, sede.tenantId, body.menuSlug);
    if (!assigned.ok) {
      const status = statusForSlugAssignError(assigned.error);
      return NextResponse.json(
        { error: status === 500 ? 'Failed to save menu' : assigned.error },
        { status },
      );
    }

    const conn = await getTenantConnection(sede.dbName);
    const current = await readMenuDocument(conn);
    const saved = await writeMenuDocument(conn, {
      ...current,
      draft: normalizeMenuDraft(body?.draft),
    });

    return NextResponse.json({
      tenant: sedeSummary(sede),
      menuSlug: normalizeMenuSlug(body.menuSlug),
      menu: normalizeMenuDocument(saved),
    });
  } catch (error) {
    return errorResponse(error, 'Failed to save menu');
  }
}

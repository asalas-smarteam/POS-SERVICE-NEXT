import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { getTenantConnection } from '@/lib/db/connections';
import { canPublish, publishDraft } from '@/lib/menu/menuSchema';
import { readMenuDocument, writeMenuDocument } from '@/lib/menu/menuSettings';

export async function POST(req, { params }) {
  try {
    const { tenantId } = await params;
    const { sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    if (!sede.menuSlug) {
      return NextResponse.json({ error: 'slug_missing' }, { status: 400 });
    }

    const conn = await getTenantConnection(sede.dbName);
    const current = await readMenuDocument(conn);

    const blocked = canPublish(current);
    if (blocked) {
      return NextResponse.json({ error: blocked }, { status: 400 });
    }

    const published = await writeMenuDocument(
      conn,
      publishDraft(current, new Date().toISOString()),
    );

    // Publicar tiene que invalidar la cache de la pagina publica, o el visitante
    // seguiria viendo la version anterior hasta que expire el revalidate.
    const routes = [`/m/${sede.menuSlug}`];
    for (const route of routes) {
      revalidatePath(route);
    }

    return NextResponse.json({ menu: published, revalidated: routes });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to publish menu' : error.message },
      { status },
    );
  }
}

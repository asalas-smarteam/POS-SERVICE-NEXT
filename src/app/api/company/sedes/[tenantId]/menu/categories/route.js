import { NextResponse } from 'next/server';
import { requireOwnerSede } from '@/lib/auth/ownerSede';
import { getTenantConnection } from '@/lib/db/connections';
import { getProductCategories } from '@/lib/tenant/categorySettings';

// El editor vive en el panel del dueño, que no tiene sesion de sede, asi que
// no puede reusar /api/settings: necesita su propia lectura company-scoped,
// que requireOwnerSede resuelve validando pertenencia y el feature online-menu.
export async function GET(req, { params }) {
  try {
    const { tenantId } = await params;
    const { sede } = await requireOwnerSede(req, tenantId, 'online-menu');

    const conn = await getTenantConnection(sede.dbName);
    const categories = await getProductCategories(conn);

    return NextResponse.json({
      // Estricto (=== true) y no "!== false": es la misma comparacion que usa
      // renderableBlocks en menuSchema.js para decidir si la pagina publica
      // muestra la categoria. Si el editor ofreciera aca una categoria que el
      // renderer despues descarta, el dueno la marcaria, el PUT la guardaria,
      // el publish diria que todo salio bien, y la seccion nunca aparece: sin
      // error en ninguna capa. No "relajar" esto de vuelta a "!== false".
      categories: categories
        .filter((category) => category?.id && category.active === true)
        .map((category) => ({ id: String(category.id), label: category.label ?? String(category.id) })),
    });
  } catch (error) {
    const status = error?.status || 500;
    return NextResponse.json(
      { error: status === 500 ? 'Failed to load categories' : error.message },
      { status },
    );
  }
}

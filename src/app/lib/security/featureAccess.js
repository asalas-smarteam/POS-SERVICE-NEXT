import { resolveTenant } from "@/lib/tenant/resolveTenant";
import { authorizeRequest } from "@/lib/security/authorizeRequest";
import { hasFeature, isKnownFeature } from "@/lib/features/featureRegistry";

// Gate por plan contratado. Es un eje ortogonal al de roles: para entrar a un
// modulo hacen falta las dos cosas, que el rol lo permita y que la cuenta lo
// tenga contratado.
//
// La autoridad es siempre Tenant.features (DB). El claim del JWT existe solo
// para que el middleware, que corre en edge y no puede tocar mongo, pueda
// gatear las paginas; un token viejo nunca concede acceso que la DB no
// respalde porque cada endpoint revalida por aca.

function featureError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

export function assertFeature(tenantFeatures, key) {
  if (!isKnownFeature(key)) {
    throw featureError(`Unknown feature '${key}'`, 500);
  }

  if (!hasFeature(tenantFeatures, key)) {
    throw featureError("Feature not included in your plan", 403);
  }
}

/**
 * Chequeo combinado para route handlers: resuelve el tenant, valida el rol
 * contra el modulo y valida que la cuenta tenga el feature contratado.
 * Devuelve `{ tenant, payload }`; abrir la conexion queda del lado del handler,
 * como en el resto de las rutas.
 */
export async function requireModuleAccess(req, moduleKey) {
  const tenant = await resolveTenant(req);
  const payload = await authorizeRequest(req, moduleKey);
  assertFeature(tenant.features, moduleKey);

  return { tenant, payload };
}

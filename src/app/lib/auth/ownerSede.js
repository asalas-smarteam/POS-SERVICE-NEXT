import { getOwnerContext } from '@/lib/auth/ownerAuth';
import { connectMasterDB } from '@/lib/db/master';
import { TenantModel } from '@/models/master/Tenant';
import { hasFeature } from '@/lib/features/featureRegistry';

function sedeError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

// Gate por pertenencia de sede para el panel del dueño. Es el equivalente de
// requireModuleAccess (src/lib/security/featureAccess.js) para el eje del
// dueño: alla la sesion trae el tenantId y se resuelve por rol; aca el token
// del dueño no trae tenantId, asi que la pertenencia siempre se revalida
// contra el master con el companyId del token.
//
// La sede "no existe" y la sede "no es tuya" devuelven el mismo 403 con el
// mismo mensaje a proposito: distinguirlos le confirmaria a quien prueba
// tenantIds ajenos cuales sí existen.
export async function requireOwnerSede(req, tenantId, featureKey) {
  const { companyId } = await getOwnerContext(req);

  const masterConn = await connectMasterDB();
  const Tenant = TenantModel(masterConn);
  const sede = await Tenant.findOne({
    tenantId: String(tenantId),
    companyId,
    status: 'active',
  }).lean();

  if (!sede) {
    throw sedeError('Sede not available', 403);
  }

  // El feature se chequea solo si el caller lo pide, y siempre despues de
  // probar pertenencia: quien no es dueño de la sede no debe aprender nada
  // de su plan.
  if (featureKey && !hasFeature(sede.features, featureKey)) {
    throw sedeError('feature_not_included', 403);
  }

  return { companyId, masterConn, sede };
}

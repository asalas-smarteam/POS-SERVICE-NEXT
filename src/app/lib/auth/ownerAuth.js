import { verifyToken } from '@/lib/auth/jwt';
import { connectMasterDB } from '@/lib/db/master';
import { CompanyUserModel } from '@/models/master/CompanyUser';

function authError(message, status) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function getTokenFromRequest(req) {
  const authHeader = req.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length);
  }
  return req.cookies.get('auth_token')?.value ?? null;
}

// Autoriza una request del plano de control (panel del dueño). Solo tokens con
// kind='owner' pasan; ademas re-valida contra master que el dueño siga activo y
// pertenezca a la empresa del token (permite revocacion).
export async function getOwnerContext(req) {
  const token = getTokenFromRequest(req);
  if (!token) {
    throw authError('Unauthorized', 401);
  }

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    throw authError('Unauthorized', 401);
  }

  if (payload?.kind !== 'owner' || !payload?.companyId || !payload?.ownerId) {
    throw authError('Forbidden', 403);
  }

  const masterConn = await connectMasterDB();
  const CompanyUser = CompanyUserModel(masterConn);
  const owner = await CompanyUser.findById(payload.ownerId).lean();

  if (!owner || owner.isActive === false) {
    throw authError('Unauthorized', 401);
  }

  if (String(owner.companyId) !== String(payload.companyId)) {
    throw authError('Forbidden', 403);
  }

  return {
    payload,
    owner,
    ownerId: String(owner._id),
    companyId: String(owner.companyId),
    ownerEmail: owner.email,
  };
}

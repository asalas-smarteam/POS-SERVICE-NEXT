import { CompanyUserModel } from '@/models/master/CompanyUser';
import { UserIndexModel } from '@/models/master/UserIndex';
import { hashEmail } from '@/lib/utils/hashEmail';

// Un email debe ser unico entre dueños (CompanyUser) y staff de cualquier sede
// (UserIndex), para que el login nunca sea ambiguo entre plano de control y
// plano de datos.
export async function isEmailTaken(masterConn, email) {
  const emailHash = hashEmail(email);
  const CompanyUser = CompanyUserModel(masterConn);
  const UserIndex = UserIndexModel(masterConn);

  const [ownerMatch, staffMatch] = await Promise.all([
    CompanyUser.findOne({ emailHash }).lean(),
    UserIndex.findOne({ emailHash }).lean(),
  ]);

  return Boolean(ownerMatch || staffMatch);
}

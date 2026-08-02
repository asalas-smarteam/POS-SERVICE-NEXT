import { connectMasterDB } from '@/lib/db/master';
import { CompanyModel } from '@/models/master/Company';

function generateRandomCompanyId() {
  return String(Math.floor(10000000 + Math.random() * 90000000));
}

export async function generateUniqueCompanyId() {
  const masterConn = await connectMasterDB();
  const Company = CompanyModel(masterConn);

  while (true) {
    const companyId = generateRandomCompanyId();
    const existing = await Company.findOne({ companyId }).lean();

    if (!existing) {
      return companyId;
    }
  }
}

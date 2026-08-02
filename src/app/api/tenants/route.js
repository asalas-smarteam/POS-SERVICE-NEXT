import bcrypt from 'bcryptjs';
import { NextResponse } from 'next/server';
import { connectMasterDB } from '@/lib/db/master';
import { CompanyModel } from '@/models/master/Company';
import { CompanyUserModel } from '@/models/master/CompanyUser';
import { TenantModel } from '@/models/master/Tenant';
import { getTenantConnection } from '@/lib/db/connections';
import { seedTenantDB } from '@/lib/tenant/seedTenant';
import { ensureDefaultPlans } from '@/lib/master/plans';
import { generateUniqueTenantId } from '@/lib/utils/generateTenantId';
import { generateUniqueCompanyId } from '@/lib/utils/generateCompanyId';
import { hashEmail } from '@/lib/utils/hashEmail';
import { isEmailTaken } from '@/lib/master/emailUniqueness';
import {
  buildPricingBreakdown,
  resolvePlanPricing,
} from '@/lib/master/subscriptionPricing';
import { getActiveFeaturePrices } from '@/lib/master/featurePrices';
import { getActivePromotions } from '@/lib/master/promotions';
import { resolveFeatures } from '@/lib/features/featureRegistry';

const MIN_PASSWORD_LENGTH = 8;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BRANCHES = 20;

function normalizeInternalDomain(name) {
  // NFD descompone acentos; el filtro [^a-z0-9] elimina tanto los signos
  // combinantes como cualquier otro caracter no alfanumerico.
  const normalizedBase = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[^a-z0-9]/g, '');

  return `${normalizedBase || 'tenant'}.internal`;
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Limpieza best-effort: al no existir transacciones entre bases distintas,
// si el onboarding falla a mitad deshacemos lo ya creado (DBs de sede, tenants,
// el dueño y la empresa) para no dejar estado parcial.
async function rollbackOnboarding({
  Company,
  CompanyUser,
  Tenant,
  companyId,
  tenantIds,
  dbNames,
}) {
  for (const dbName of dbNames) {
    try {
      const conn = await getTenantConnection(dbName);
      await conn.dropDatabase();
    } catch (err) {
      console.error(`Rollback: failed to drop DB ${dbName}`, err);
    }
  }

  try {
    if (Tenant && tenantIds.length) {
      await Tenant.deleteMany({ tenantId: { $in: tenantIds } });
    }
    if (CompanyUser && companyId) {
      await CompanyUser.deleteMany({ companyId });
    }
    if (Company && companyId) {
      await Company.deleteOne({ companyId });
    }
  } catch (err) {
    console.error('Rollback: failed to clean master DB', err);
  }
}

export async function POST(req) {
  let Company;
  let CompanyUser;
  let Tenant;
  let companyId = null;
  const createdTenantIds = [];
  const createdDbNames = [];

  try {
    const body = await req.json();

    // Acepta el payload nuevo (companyName/ownerEmail/ownerPassword) y el
    // antiguo (name/adminEmail/adminPassword) para no romper compatibilidad.
    const companyName = (body?.companyName ?? body?.name)?.toString()?.trim();
    const plan = body?.plan?.toString()?.trim();
    const ownerEmail = (body?.ownerEmail ?? body?.adminEmail)
      ?.toString()
      ?.trim()
      .toLowerCase();
    const ownerPassword =
      (body?.ownerPassword ?? body?.adminPassword)?.toString() || '';
    const branchCount = Math.floor(Number(body?.branchCount ?? 1));
    const sedeLabels = Array.isArray(body?.sedeLabels) ? body.sedeLabels : [];

    if (!companyName || !plan || !ownerEmail || !ownerPassword) {
      return NextResponse.json(
        { error: 'companyName, plan, ownerEmail and ownerPassword are required' },
        { status: 400 }
      );
    }

    if (!EMAIL_REGEX.test(ownerEmail)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    if (ownerPassword.length < MIN_PASSWORD_LENGTH) {
      return NextResponse.json(
        { error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` },
        { status: 400 }
      );
    }

    if (!Number.isInteger(branchCount) || branchCount < 1 || branchCount > MAX_BRANCHES) {
      return NextResponse.json(
        { error: `branchCount must be an integer between 1 and ${MAX_BRANCHES}` },
        { status: 400 }
      );
    }

    const masterConn = await connectMasterDB();
    Company = CompanyModel(masterConn);
    CompanyUser = CompanyUserModel(masterConn);
    Tenant = TenantModel(masterConn);
    const Plan = await ensureDefaultPlans(masterConn);

    // Solo planes publicos y contratables: el custom se asigna desde el
    // backend y el enterprise todavia no se puede comprar.
    const activePlan = await Plan.findOne({
      slug: plan,
      isActive: true,
      isPubliclySelectable: true,
    }).lean();
    if (!activePlan) {
      return NextResponse.json({ error: 'Invalid plan selected' }, { status: 400 });
    }

    if (activePlan.isComingSoon) {
      return NextResponse.json(
        { error: 'Plan is not available yet' },
        { status: 400 }
      );
    }

    // Unicidad por empresa (varias sedes comparten el mismo nombre de empresa).
    const existingCompany = await Company.findOne({
      name: { $regex: `^${escapeRegex(companyName)}$`, $options: 'i' },
    }).lean();

    if (existingCompany) {
      return NextResponse.json(
        { error: 'Company name already exists' },
        { status: 409 }
      );
    }

    const emailHash = hashEmail(ownerEmail);
    if (await isEmailTaken(masterConn, ownerEmail)) {
      return NextResponse.json(
        { error: 'Owner email already belongs to another account' },
        { status: 409 }
      );
    }

    // Precio recalculado en el servidor (el del cliente es solo visual).
    const { basePrice, pricePerExtraBranch } = resolvePlanPricing(activePlan);
    const [featurePrices, promotions] = await Promise.all([
      getActiveFeaturePrices(masterConn),
      getActivePromotions(masterConn),
    ]);

    const features = resolveFeatures(activePlan.features);
    const breakdown = buildPricingBreakdown({
      plan: activePlan,
      featurePrices,
      features,
      branchCount,
      promotions,
    });

    companyId = await generateUniqueCompanyId();

    const company = await Company.create({
      companyId,
      name: companyName,
      ownerEmailHash: emailHash,
      plan,
      features,
      addOnFeatures: [],
      branchCount,
      monthlyPrice: breakdown.finalTotal,
      originalMonthlyPrice: breakdown.originalTotal,
      appliedPromotions: breakdown.appliedPromotions,
      basePrice,
      pricePerExtraBranch,
      status: 'active',
    });

    const passwordHash = await bcrypt.hash(ownerPassword, 10);

    // Identidad del dueño: UNA sola vez en master (plano de control). No se
    // replica en las sedes.
    await CompanyUser.create({
      companyId,
      email: ownerEmail,
      emailHash,
      passwordHash,
      name: '',
      role: 'OWNER',
      isActive: true,
    });

    const internalDomain = normalizeInternalDomain(companyName);
    const sedes = [];

    // Cada sede = un tenant independiente con su propia DB. Nace VACIA (sin
    // usuarios); el dueño crea el staff desde el panel o al entrar a la sede.
    for (let i = 0; i < branchCount; i += 1) {
      const sedeIndex = i + 1;
      const sedeLabel = sedeLabels[i]?.toString()?.trim() || `Sede ${sedeIndex}`;

      const tenantId = await generateUniqueTenantId();
      const dbName = `tenant_${tenantId}`;

      await Tenant.create({
        tenantId,
        name: companyName,
        dbName,
        plan,
        // Denormalizado desde la empresa: es lo que lee el gate de la API en
        // cada request sin tener que cargar Company.
        features,
        internalDomain,
        companyId,
        sedeLabel,
        sedeIndex,
        status: 'active',
      });
      createdTenantIds.push(tenantId);

      const tenantConn = await getTenantConnection(dbName);
      createdDbNames.push(dbName);

      await seedTenantDB(tenantConn);

      sedes.push({ tenantId, sedeLabel, sedeIndex });
    }

    return NextResponse.json({ ok: true, company, sedes });
  } catch (error) {
    console.error(error);

    await rollbackOnboarding({
      Company,
      CompanyUser,
      Tenant,
      companyId,
      tenantIds: createdTenantIds,
      dbNames: createdDbNames,
    });

    return NextResponse.json(
      { error: error.message || 'Failed to register company' },
      { status: 500 }
    );
  }
}

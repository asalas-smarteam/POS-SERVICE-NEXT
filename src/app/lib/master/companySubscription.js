import { CompanyModel } from '@/models/master/Company';
import { PlanModel } from '@/models/master/Plan';
import { TenantModel } from '@/models/master/Tenant';
import { getActiveFeaturePrices } from '@/lib/master/featurePrices';
import { getActivePromotions } from '@/lib/master/promotions';
import { buildPricingBreakdown } from '@/lib/master/subscriptionPricing';
import { resolveFeatures, SELECTABLE_FEATURE_KEYS } from '@/lib/features/featureRegistry';

// Estado comercial de una empresa: plan, entitlements y desglose del mes.
// Company es la autoridad; Tenant.features es la copia por sede que lee el gate
// de la API en cada request.
export async function getCompanySubscription(masterConn, companyId) {
  const Company = CompanyModel(masterConn);
  const Plan = PlanModel(masterConn);

  const company = await Company.findOne({ companyId }).lean();
  if (!company) {
    const error = new Error('Company not found');
    error.status = 404;
    throw error;
  }

  const [plan, featurePrices, promotions] = await Promise.all([
    Plan.findOne({ slug: company.plan }).lean(),
    getActiveFeaturePrices(masterConn),
    getActivePromotions(masterConn),
  ]);

  const features = resolveFeatures(company.features);
  const breakdown = buildPricingBreakdown({
    plan,
    featurePrices,
    features,
    addOnFeatures: company.addOnFeatures,
    branchCount: company.branchCount,
    promotions,
  });

  // Catalogo de lo que todavia se puede activar, con su precio ya calculado
  // para el numero de sedes que tiene la empresa.
  const extras = Math.max(0, (company.branchCount || 1) - 1);
  const available = SELECTABLE_FEATURE_KEYS.filter((key) => !features.includes(key)).map(
    (key) => {
      const price = featurePrices.find((entry) => entry.key === key);
      return {
        key,
        monthlyPrice:
          (price?.monthlyPrice ?? 0) + extras * (price?.pricePerExtraBranch ?? 0),
        available: Boolean(price),
      };
    }
  );

  return { company, plan, features, breakdown, availableFeatures: available };
}

/**
 * Activa un feature para toda la empresa.
 *
 * Sin pasarela de pago: se habilita en el momento, se propaga a las features de
 * todas las sedes y se recalcula la cuota mensual. Devuelve el estado nuevo.
 */
export async function activateCompanyFeature(masterConn, companyId, featureKey) {
  const { company, plan, features } = await getCompanySubscription(masterConn, companyId);

  if (!SELECTABLE_FEATURE_KEYS.includes(featureKey)) {
    const error = new Error('Feature is not purchasable');
    error.status = 400;
    throw error;
  }

  if (features.includes(featureKey)) {
    const error = new Error('Feature already active');
    error.status = 409;
    throw error;
  }

  const nextFeatures = resolveFeatures([...features, featureKey]);
  const nextAddOns = Array.from(
    new Set([...(company.addOnFeatures ?? []), featureKey])
  );

  const [featurePrices, promotions] = await Promise.all([
    getActiveFeaturePrices(masterConn),
    getActivePromotions(masterConn),
  ]);

  const breakdown = buildPricingBreakdown({
    plan,
    featurePrices,
    features: nextFeatures,
    addOnFeatures: nextAddOns,
    branchCount: company.branchCount,
    promotions,
  });

  const Company = CompanyModel(masterConn);
  const Tenant = TenantModel(masterConn);

  await Company.updateOne(
    { companyId },
    {
      $set: {
        features: nextFeatures,
        addOnFeatures: nextAddOns,
        monthlyPrice: breakdown.finalTotal,
        originalMonthlyPrice: breakdown.originalTotal,
        appliedPromotions: breakdown.appliedPromotions,
      },
    }
  );

  // Todas las sedes, no solo la activa: el entitlement es de la empresa.
  await Tenant.updateMany({ companyId }, { $set: { features: nextFeatures } });

  return { features: nextFeatures, breakdown };
}

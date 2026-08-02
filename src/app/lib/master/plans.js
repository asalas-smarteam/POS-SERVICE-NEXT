import { PlanModel } from '@/models/master/Plan';
import { resolveFeatures } from '@/lib/features/featureRegistry';

// Subir este numero propaga los defaults de abajo a los planes ya sembrados.
// Mientras no suba, un precio editado a mano en la DB sobrevive: antes se hacia
// $set incondicional en cada request y toda edicion se revertia sola.
export const PLANS_SEED_VERSION = 1;

// `name` y `description` quedan como fallback; la UI resuelve ambos por slug
// desde el namespace i18n `Plans`, para que no salgan siempre en ingles.
const DEFAULT_PLANS = [
  {
    name: 'Basic',
    slug: 'basic',
    description: 'Point of sale, products and inventory',
    priceMonthly: 40,
    basePrice: 40,
    pricePerExtraBranch: 20,
    maxOrdersPerDay: null,
    features: ['orders', 'active-orders', 'products', 'ingredients', 'settings', 'users'],
    isActive: true,
    isComingSoon: false,
    isCustomizable: false,
    isPubliclySelectable: true,
  },
  {
    name: 'Professional',
    slug: 'pro',
    description: 'Everything in Basic plus reports, floor plan and kitchen',
    priceMonthly: 55,
    basePrice: 55,
    pricePerExtraBranch: 30,
    maxOrdersPerDay: null,
    features: [
      'orders',
      'active-orders',
      'products',
      'ingredients',
      'settings',
      'users',
      'dashboard',
      'floor',
      'kitchen',
    ],
    isActive: true,
    isComingSoon: false,
    isCustomizable: false,
    isPubliclySelectable: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Custom solution',
    priceMonthly: 0,
    basePrice: 0,
    pricePerExtraBranch: 50,
    maxOrdersPerDay: null,
    features: [],
    isActive: true,
    isComingSoon: true,
    isCustomizable: false,
    isPubliclySelectable: true,
  },
  {
    // El set de features vive en Company.features, no aca. Se asigna desde el
    // backend, por eso no es publico.
    name: 'Custom',
    slug: 'custom',
    description: 'Pick only the modules you need',
    priceMonthly: 0,
    basePrice: 0,
    pricePerExtraBranch: 0,
    maxOrdersPerDay: null,
    features: [],
    isActive: true,
    isComingSoon: false,
    isCustomizable: true,
    isPubliclySelectable: false,
  },
];

// Campos que la siembra administra: se reescriben solo al subir la version.
const MANAGED_FIELDS = [
  'name',
  'description',
  'priceMonthly',
  'basePrice',
  'pricePerExtraBranch',
  'features',
  'isComingSoon',
  'isCustomizable',
  'isPubliclySelectable',
];

const pickManaged = (plan) =>
  Object.fromEntries(MANAGED_FIELDS.map((field) => [field, plan[field]]));

export async function ensureDefaultPlans(masterConn) {
  const Plan = PlanModel(masterConn);

  await Promise.all(
    DEFAULT_PLANS.map(async (plan) => {
      // Los planes cerrados declaran sus features; resolveFeatures inyecta los
      // alwaysOn (settings, users) para que nunca falten por un typo del seed.
      const features = plan.isCustomizable ? [] : resolveFeatures(plan.features);
      const seeded = { ...plan, features };

      await Plan.updateOne(
        { slug: seeded.slug },
        { $setOnInsert: { ...seeded, seedVersion: PLANS_SEED_VERSION } },
        { upsert: true }
      );

      // $lt no matchea documentos sin el campo, y los planes sembrados antes de
      // esta version no lo tienen: hay que contemplarlos explicitamente.
      await Plan.updateOne(
        {
          slug: seeded.slug,
          $or: [
            { seedVersion: { $exists: false } },
            { seedVersion: { $lt: PLANS_SEED_VERSION } },
          ],
        },
        { $set: { ...pickManaged(seeded), seedVersion: PLANS_SEED_VERSION } }
      );
    })
  );

  return Plan;
}

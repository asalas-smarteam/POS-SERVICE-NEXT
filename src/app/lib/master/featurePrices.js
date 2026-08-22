import { FeaturePriceModel } from '@/models/master/FeaturePrice';
import { SELECTABLE_FEATURE_KEYS } from '@/lib/features/featureRegistry';

// Misma semantica que PLANS_SEED_VERSION: subirla propaga los defaults, no
// subirla deja sobrevivir los precios editados a mano.
//
// Agregar una fila nueva (como 'online-menu') no requiere subir la version:
// $setOnInsert la siembra con la version actual sin tocar las demas filas.
// Subirla es unicamente para cuando se quiere propagar a proposito un precio
// cambiado a TODAS las cuentas, y pisaria los precios editados a mano de los
// modulos existentes. No subir por reflejo al agregar un feature.
export const FEATURE_PRICES_SEED_VERSION = 1;

// Precios de arranque, pensados para que armar todo a la carta salga mas caro
// que contratar el plan cerrado equivalente (custom completo 66 vs pro 55).
// Son solo defaults: se editan en la coleccion featureprices.
const DEFAULT_FEATURE_PRICES = [
  { key: 'orders', monthlyPrice: 18, pricePerExtraBranch: 6, sortOrder: 10 },
  { key: 'active-orders', monthlyPrice: 6, pricePerExtraBranch: 2, sortOrder: 20 },
  { key: 'products', monthlyPrice: 12, pricePerExtraBranch: 4, sortOrder: 30 },
  { key: 'ingredients', monthlyPrice: 6, pricePerExtraBranch: 2, sortOrder: 40 },
  { key: 'dashboard', monthlyPrice: 8, pricePerExtraBranch: 3, sortOrder: 50 },
  { key: 'floor', monthlyPrice: 8, pricePerExtraBranch: 4, sortOrder: 60 },
  { key: 'kitchen', monthlyPrice: 8, pricePerExtraBranch: 4, sortOrder: 70 },
  { key: 'online-menu', monthlyPrice: 10, pricePerExtraBranch: 4, sortOrder: 80 },
];

const MANAGED_FIELDS = ['monthlyPrice', 'pricePerExtraBranch', 'sortOrder'];

const pickManaged = (entry) =>
  Object.fromEntries(MANAGED_FIELDS.map((field) => [field, entry[field]]));

export async function ensureDefaultFeaturePrices(masterConn) {
  const FeaturePrice = FeaturePriceModel(masterConn);

  // settings y users son alwaysOn: no se venden sueltos, asi que no se siembran.
  const seeds = DEFAULT_FEATURE_PRICES.filter((entry) =>
    SELECTABLE_FEATURE_KEYS.includes(entry.key)
  );

  await Promise.all(
    seeds.map(async (entry) => {
      await FeaturePrice.updateOne(
        { key: entry.key },
        {
          $setOnInsert: {
            ...entry,
            isActive: true,
            seedVersion: FEATURE_PRICES_SEED_VERSION,
          },
        },
        { upsert: true }
      );

      // Ver la nota en plans.js: $lt no matchea campos ausentes.
      await FeaturePrice.updateOne(
        {
          key: entry.key,
          $or: [
            { seedVersion: { $exists: false } },
            { seedVersion: { $lt: FEATURE_PRICES_SEED_VERSION } },
          ],
        },
        { $set: { ...pickManaged(entry), seedVersion: FEATURE_PRICES_SEED_VERSION } }
      );
    })
  );

  return FeaturePrice;
}

export async function getActiveFeaturePrices(masterConn) {
  const FeaturePrice = await ensureDefaultFeaturePrices(masterConn);

  return FeaturePrice.find(
    { isActive: true },
    { _id: 0, key: 1, monthlyPrice: 1, pricePerExtraBranch: 1, sortOrder: 1 }
  )
    .sort({ sortOrder: 1 })
    .lean();
}

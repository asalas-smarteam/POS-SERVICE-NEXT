import { PromotionModel } from '@/models/master/Promotion';

// Trae las promociones vigentes ahora. La ventana de vigencia se filtra en la
// query para no traer historico: startsAt/endsAt nulos significan "sin limite".
export async function getActivePromotions(masterConn, now = new Date()) {
  const Promotion = PromotionModel(masterConn);

  return Promotion.find(
    {
      isActive: true,
      $and: [
        { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
        { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
      ],
    },
    { _id: 0, scope: 1, targetSlug: 1, type: 1, value: 1, labelKey: 1 }
  ).lean();
}

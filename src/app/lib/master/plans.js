import { PlanModel } from '@/models/master/Plan';

const DEFAULT_PLANS = [
  {
    name: 'Basic',
    slug: 'basic',
    description: 'Up to 50 orders per day',
    priceMonthly: 29,
    maxOrdersPerDay: 50,
    features: ['Inventory management'],
    isActive: true,
  },
  {
    name: 'Professional',
    slug: 'pro',
    description: 'Unlimited orders + Reports',
    priceMonthly: 79,
    maxOrdersPerDay: null,
    features: ['Inventory', 'Reports'],
    isActive: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    description: 'Custom solution',
    priceMonthly: 0,
    maxOrdersPerDay: null,
    features: ['Custom features'],
    isActive: true,
  },
];

export async function ensureDefaultPlans(masterConn) {
  const Plan = PlanModel(masterConn);

  await Promise.all(
    DEFAULT_PLANS.map((plan) =>
      Plan.updateOne(
        { slug: plan.slug },
        { $setOnInsert: plan },
        { upsert: true }
      )
    )
  );

  return Plan;
}

import { TenantSettingModel } from '@/models/tenant/TenantSetting';

export const TENANT_SETTINGS_DEFAULTS = [
  {
    description: 'Settings',
    data: {
      currency: {
        code: 'CRC',
        symbol: '₡',
        decimals: 0,
      },
    },
  },
  {
    description: 'Product Category',
    data: [
      { id: 'bebidas', label: 'Bebida', active: true },
      { id: 'plato_fuerte', label: 'Plato Fuerte', active: true },
      { id: 'postres', label: 'Postre', active: true },
    ],
  },
  {
    description: 'Units',
    data: {
      ingredients: [
        { id: 'unit', label: 'Unidad' },
        { id: 'g', label: 'Gramos' },
        { id: 'kg', label: 'Kilos' },
      ],
      products: [{ id: 'unit', label: 'Unidad' }],
    },
  },
];

const cloneData = (value) => JSON.parse(JSON.stringify(value));

export async function ensureDefaultSettings(conn) {
  const TenantSetting = TenantSettingModel(conn);

  await Promise.all(
    TENANT_SETTINGS_DEFAULTS.map((setting) =>
      TenantSetting.updateOne(
        { description: setting.description },
        {
          $setOnInsert: {
            description: setting.description,
            data: cloneData(setting.data),
          },
        },
        { upsert: true }
      )
    )
  );

  return TenantSetting.find().sort({ createdAt: 1 });
}

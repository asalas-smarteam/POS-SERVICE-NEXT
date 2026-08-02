import mongoose from 'mongoose';

const CompanySchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  ownerEmailHash: {
    type: String,
    required: true,
    index: true,
  },
  plan: {
    type: String,
    required: true,
  },
  branchCount: {
    type: Number,
    required: true,
    min: 1,
  },
  // Entitlements efectivos de la empresa: los del plan mas los add-ons
  // activados despues. Autoridad comercial; se denormaliza a Tenant.features
  // de todas las sedes en cada cambio.
  features: {
    type: [String],
    default: [],
  },
  // Subconjunto de features comprado por fuera del plan. Se guarda aparte para
  // poder desglosar la factura y para que un cambio de plan no lo pise.
  addOnFeatures: {
    type: [String],
    default: [],
  },
  // Precio calculado y guardado al registrar (base + extras).
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  // Precio antes de descuentos, para poder mostrar el tachado y auditar que
  // promocion se aplico.
  originalMonthlyPrice: {
    type: Number,
    default: 0,
    min: 0,
  },
  appliedPromotions: {
    type: [
      {
        _id: false,
        scope: String,
        targetSlug: String,
        type: String,
        value: Number,
        labelKey: String,
      },
    ],
    default: [],
  },
  // Snapshot del pricing del plan al momento del registro, para que un
  // cambio posterior del plan no altere retroactivamente lo pactado.
  basePrice: {
    type: Number,
    required: true,
    min: 0,
  },
  pricePerExtraBranch: {
    type: Number,
    required: true,
    min: 0,
  },
  status: {
    type: String,
    default: 'active',
  },
}, { timestamps: true });

export function CompanyModel(conn) {
  return conn.model('Company', CompanySchema);
}

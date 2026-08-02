import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  description: { type: String, default: '' },
  priceMonthly: { type: Number, required: true, min: 0 },
  // Pricing multi-sede: precio de la primera sede + precio por cada sede extra.
  basePrice: { type: Number, default: 0, min: 0 },
  pricePerExtraBranch: { type: Number, default: 0, min: 0 },
  // Slugs del registro de features (lib/features/featureRegistry.js), no texto
  // de marketing: es la lista de rutas que el plan habilita.
  features: [{ type: String }],
  maxOrdersPerDay: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
  // Se muestra en el registro pero no se puede contratar todavia.
  isComingSoon: { type: Boolean, default: false },
  // El set de features se define por empresa en Company.features, no aca.
  isCustomizable: { type: Boolean, default: false },
  // Los planes no publicos (custom) se asignan desde el backend y no aparecen
  // en el selector del registro.
  isPubliclySelectable: { type: Boolean, default: true },
  // Version del default sembrado en lib/master/plans.js. Permite propagar un
  // cambio intencional de precios sin volver al $set incondicional, que
  // pisaba cualquier edicion manual en cada request.
  seedVersion: { type: Number, default: 0 },
}, { timestamps: true });

export function PlanModel(conn) {
  return conn.model('Plan', PlanSchema);
}

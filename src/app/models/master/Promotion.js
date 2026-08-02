import mongoose from 'mongoose';

// Descuentos con vigencia. Permiten, por ejemplo, dejar el plan basic al 10%
// durante una semana sin tocar el precio del plan: el precio original se sigue
// mostrando tachado al lado del final.
const PromotionSchema = new mongoose.Schema({
  // 'plan'   -> targetSlug es el slug de un plan
  // 'feature'-> targetSlug es una key del registro de features
  // 'branch' -> descuento sobre el costo por sede extra
  scope: {
    type: String,
    required: true,
    enum: ['plan', 'feature', 'branch'],
  },
  // '*' aplica a todos los targets de ese scope.
  targetSlug: {
    type: String,
    required: true,
    trim: true,
  },
  type: {
    type: String,
    required: true,
    enum: ['percent', 'fixed'],
  },
  // Porcentaje (0-100) o monto fijo, segun `type`.
  value: {
    type: Number,
    required: true,
    min: 0,
  },
  startsAt: {
    type: Date,
    default: null,
  },
  endsAt: {
    type: Date,
    default: null,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  // Clave i18n opcional para el badge ("Promo de aniversario").
  labelKey: {
    type: String,
    default: '',
  },
}, { timestamps: true });

PromotionSchema.index({ scope: 1, targetSlug: 1, isActive: 1 });

export function PromotionModel(conn) {
  return conn.model('Promotion', PromotionSchema);
}

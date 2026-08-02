import mongoose from 'mongoose';

// Precio de cada feature vendido suelto. Es el catalogo con el que se arma el
// plan custom y con el que el dueño activa add-ons desde su panel.
//
// A proposito no guarda nombre ni descripcion: se resuelven por i18n desde
// `key` (namespace Plans). Guardarlos en la DB es lo que hace que hoy los
// nombres de plan se rendericen en ingles sin importar el locale.
const FeaturePriceSchema = new mongoose.Schema({
  // Debe existir en lib/features/featureRegistry.js.
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  monthlyPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  // Cuanto aporta este feature al costo de cada sede extra en el plan custom.
  // Los planes cerrados usan Plan.pricePerExtraBranch en su lugar.
  pricePerExtraBranch: {
    type: Number,
    default: 0,
    min: 0,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  sortOrder: {
    type: Number,
    default: 0,
  },
  // Ver FEATURE_PRICES_SEED_VERSION en lib/master/featurePrices.js.
  seedVersion: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

export function FeaturePriceModel(conn) {
  return conn.model('FeaturePrice', FeaturePriceSchema);
}

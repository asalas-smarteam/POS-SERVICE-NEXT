import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  // La unidad de medida es configurable por el tenant (settings), por eso se
  // guarda como id/slug libre y NO como enum fijo: un enum rechazaba cualquier
  // unidad nueva creada en la configuracion (p. ej. "mililitros").
  unit: {
    type: String,
    default: 'unit',
  },
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
}, { timestamps: true });

export function IngredientModel(conn) {
  return conn.model('Ingredient', IngredientSchema);
}

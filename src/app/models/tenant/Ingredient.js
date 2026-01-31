import mongoose from 'mongoose';

const IngredientSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unit: {
    type: String,
    enum: ['g', 'kg', 'ml', 'l', 'unit'],
    default: 'unit',
  },
  stock: { type: Number, default: 0 },
  minStock: { type: Number, default: 0 },
}, { timestamps: true });

export function IngredientModel(conn) {
  return conn.model('Ingredient', IngredientSchema);
}

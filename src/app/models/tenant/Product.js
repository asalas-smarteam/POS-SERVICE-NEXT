import mongoose from 'mongoose';

const ProductIngredientSchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
  },
  quantity: Number, // cuánto consume
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  categoryId: { type: String, default: null },

  type: {
    type: String,
    enum: ['SIMPLE', 'COMPOSED'],
    default: 'SIMPLE',
  },

  ingredients: [ProductIngredientSchema],

  allowsHalf: { type: Boolean, default: false }, // pizzas
  allowsExtras: { type: Boolean, default: true },

}, { timestamps: true });

export function ProductModel(conn) {
  return conn.model('Product', ProductSchema);
}

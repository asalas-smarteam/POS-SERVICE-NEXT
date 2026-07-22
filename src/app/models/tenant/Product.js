import mongoose from 'mongoose';

const ProductIngredientSchema = new mongoose.Schema({
  ingredientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ingredient',
  },
  quantity: Number, // cuánto consume
  part: {
    type: String,
    enum: ['BASE', 'TOPPING'],
    default: 'TOPPING',
  },
});

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  categoryId: { type: String, default: null },
  sizeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ProductSize',
    default: null,
  },

  // Portion/size variant for categories with configurable sizes (Settings >
  // Product Sizes), e.g. "small"/"medium"/"large". Each size is its own
  // Product document with its own price and ingredient quantities — this
  // just tags which size variant this product represents. References a row
  // id from that tenant setting; unrelated to `sizeId` above (ProductSize
  // collection, used only for half-and-half pairing).
  productSizeId: { type: String, default: null },

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

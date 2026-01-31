import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  quantity: { type: Number, default: 1 },

  // Personalización
  removedIngredients: [
    { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' }
  ],
  extraIngredients: [
    {
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
      quantity: Number,
    }
  ],

  // Pizzas mitad / mitad
  halves: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
    }
  ],

  note: String,
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ['DRAFT', 'COCINA', 'LISTO'],
    default: 'DRAFT',
  },

  items: [OrderItemSchema],

}, { timestamps: true });

export function OrderModel(conn) {
  return conn.model('Order', OrderSchema);
}

import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  quantity: { type: Number, default: 1 },

  // Personalización
  notes: [String],
  modifiers: [
    {
      ingredientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
      name: String,
      quantity: Number,
      baseQuantity: Number,
      isExtra: Boolean,
    }
  ],
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
    enum: [
      'DRAFT',
      'COCINA',
      'EN_ESPERA',
      'EN_PROCESO',
      'LISTO',
      'ELIMINADO',
    ],
    default: 'DRAFT',
  },
  inventoryDiscounted: {
    type: Boolean,
    default: false,
  },

  items: [OrderItemSchema],

}, { timestamps: true });

export function OrderModel(conn) {
  return conn.model('Order', OrderSchema);
}

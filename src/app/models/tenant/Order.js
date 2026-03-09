import mongoose from 'mongoose';

const OrderItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
  productName: String,
  quantity: { type: Number, default: 1 },
  isHalfAndHalf: { type: Boolean, default: false },
  price: { type: Number, default: 0 },
  unitPrice: { type: Number, default: 0 },
  totalPrice: { type: Number, default: 0 },

  // Personalización
  notes: [String],
  modifierNotes: [String],
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
  halfAndHalfDisplayName: { type: String, default: '' },
  halves: [
    {
      productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
      productName: String,
      name: String,
    }
  ],

  note: { type: String, default: '' },
}, { _id: false });

const OrderSchema = new mongoose.Schema({
  status: {
    type: String,
    enum: [
      'DRAFT',
      'KITCHEN',
      'PENDING',
      'IN_PROGRESS',
      'READY',
      'DELETED',
      'CANCELLED',
    ],
    default: 'DRAFT',
  },
  inventoryDiscounted: {
    type: Boolean,
    default: false,
  },


  kitchenStatus: {
    type: String,
    enum: ['IN_PREPARATION', 'IN_OVEN', 'READY', 'CANCELLED'],
    default: null,
  },
  kitchenStartedAt: {
    type: Date,
    default: null,
  },
  kitchenCompletedAt: {
    type: Date,
    default: null,
  },

  items: [OrderItemSchema],
  total: { type: Number, default: 0 },
  customerName: { type: String, default: '' },
  orderType: { type: String, default: 'takeaway' },
  tableId: { type: String, default: null },
  tableLabel: { type: String, default: null },
  paymentMode: {
    type: String,
    enum: ['pay_now', 'pay_later'],
    default: 'pay_later',
  },
  isClosed: {
    type: Boolean,
    default: false,
  },
  closedAt: {
    type: Date,
    default: null,
  },

}, { timestamps: true });

export function OrderModel(conn) {
  return conn.model('Order', OrderSchema);
}

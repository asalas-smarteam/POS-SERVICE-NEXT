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

  // Ruteo a cocina, resuelto en el servidor a partir del producto y su
  // categoria (lib/tenant/kitchenRouting.js). Se congela en la linea para que
  // el ticket y el tablero no dependan de cambios de configuracion posteriores.
  requiresKitchen: { type: Boolean, default: true },

  // Split bill: identidad estable de la linea (generada en el cliente),
  // sub-cuenta dueña ('shared'/null = Compartido) y estado de asentado (pagado).
  lineId: { type: String, default: null },
  accountId: { type: String, default: null },
  // Unidades ya cobradas de esta linea (cobro parcial por cantidad: el cliente
  // paga 2 de 10 Coca Colas). `settled` = la linea quedo cubierta por completo,
  // es decir paidQuantity >= quantity.
  paidQuantity: { type: Number, default: 0 },
  settled: { type: Boolean, default: false },
  settledAt: { type: Date, default: null },
}, { _id: false });

// Sub-cuenta nombrada dentro de una orden (una persona/tab en un bar).
const SubAccountSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, default: '' },
  isPaid: { type: Boolean, default: false },
  paidAt: { type: Date, default: null },
}, { _id: false });

// Un pago (parcial o total) contra la orden.
const PaymentSchema = new mongoose.Schema({
  id: { type: String, required: true },
  amount: { type: Number, default: 0 },
  method: { type: String, default: 'cash' }, // cash | card | other
  mode: { type: String, default: 'custom' }, // full | equal | items | account | custom
  accountId: { type: String, default: null },
  note: { type: String, default: '' },
  // Snapshot de lo pagado, para el recibo (independiente de ediciones futuras).
  lines: [
    {
      name: String,
      // Unidades cubiertas por ESTE pago (puede ser menos que la linea entera).
      quantity: Number,
      totalPrice: Number,
    },
  ],
  paidAt: { type: Date, default: Date.now },
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: '' },
  },
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
      'COMPLETED',
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
    enum: ['IN_PREPARATION', 'IN_OVEN', 'READY', 'DISPATCHED', 'CANCELLED'],
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
  // User (waiter/cashier) who registered the order.
  createdBy: {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    name: { type: String, default: '' },
  },
  orderType: { type: String, default: 'takeaway' },
  tableId: { type: String, default: null },
  tableLabel: { type: String, default: null },
  paymentMode: {
    type: String,
    default: 'pay_later',
  },

  // ----- Split bill (dividir la cuenta) -----
  splitEnabled: { type: Boolean, default: false },
  subAccounts: { type: [SubAccountSchema], default: [] },
  payments: { type: [PaymentSchema], default: [] },
  amountPaid: { type: Number, default: 0 },
  paymentStatus: {
    type: String,
    enum: ['unpaid', 'partial', 'paid'],
    default: 'unpaid',
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

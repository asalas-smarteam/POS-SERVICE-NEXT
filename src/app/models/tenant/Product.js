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

// `pathname` es lo que permite borrar el archivo del almacenamiento. Guardando
// solo la url, cada reemplazo de foto dejaria un huerfano ocupando espacio para
// siempre. Las dimensiones se guardan para que next/image pueda reservar el
// aspecto y el layout no salte al cargar.
const ProductImageSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    pathname: { type: String, required: true },
    width: { type: Number, default: null },
    height: { type: Number, default: null },
  },
  // `_id: false` es una opcion del schema, no un path. Puesto dentro del primer
  // objeto, mongoose lo interpretaria como un campo llamado "_id" de tipo
  // booleano y el subdocumento igual tendria su propio ObjectId.
  { _id: false },
);

const ProductSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  description: { type: String, default: '', trim: true, maxlength: 300 },
  image: { type: ProductImageSchema, default: null },
  categoryId: { type: String, default: null },

  // Size variant for categories with configurable sizes (Settings > Product
  // Sizes), e.g. "small"/"medium"/"large". Each size is its own Product
  // document with its own price and ingredient quantities — this just tags
  // which size variant this product represents. References a row id from
  // that tenant setting.
  productSizeId: { type: String, default: null },

  type: {
    type: String,
    enum: ['SIMPLE', 'COMPOSED'],
    default: 'SIMPLE',
  },

  ingredients: [ProductIngredientSchema],

  allowsHalf: { type: Boolean, default: false }, // pizzas
  allowsExtras: { type: Boolean, default: true },

  // Kitchen routing override. 'INHERIT' (default) uses the category's
  // `requiresKitchen` flag from the "Product Category" tenant setting; 'YES'
  // and 'NO' force it for this product regardless of its category. See
  // lib/tenant/kitchenRouting.js.
  requiresKitchen: {
    type: String,
    enum: ['INHERIT', 'YES', 'NO'],
    default: 'INHERIT',
  },

}, { timestamps: true });

export function ProductModel(conn) {
  return conn.model('Product', ProductSchema);
}

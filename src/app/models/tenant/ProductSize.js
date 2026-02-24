import mongoose from 'mongoose';

const ProductSizeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  code: { type: String, required: true },
  isDefault: { type: Boolean, default: false },
}, { timestamps: true });

export function ProductSizeModel(conn) {
  return conn.model('ProductSize', ProductSizeSchema);
}

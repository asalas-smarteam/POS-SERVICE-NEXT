import mongoose from 'mongoose';

const PlanSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, unique: true, trim: true, lowercase: true },
  description: { type: String, default: '' },
  priceMonthly: { type: Number, required: true, min: 0 },
  features: [{ type: String }],
  maxOrdersPerDay: { type: Number, default: null },
  isActive: { type: Boolean, default: true },
}, { timestamps: true });

export function PlanModel(conn) {
  return conn.model('Plan', PlanSchema);
}

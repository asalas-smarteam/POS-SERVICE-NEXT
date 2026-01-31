import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  dbName: { type: String, required: true },
  plan: {
    type: String,
    enum: ['basic', 'premium', 'superpremium'],
    default: 'basic',
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
  },
}, { timestamps: true });

export function TenantModel(conn) {
  return conn.model('Tenant', TenantSchema);
}

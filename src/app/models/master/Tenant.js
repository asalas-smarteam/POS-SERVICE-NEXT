import mongoose from 'mongoose';

const TenantSchema = new mongoose.Schema({
  tenantId: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  dbName: {
    type: String,
    required: true,
    unique: true,
  },
  plan: {
    type: String,
    required: true,
  },
  internalDomain: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    default: 'active',
  },
}, { timestamps: true });

export function TenantModel(conn) {
  return conn.model('Tenant', TenantSchema);
}

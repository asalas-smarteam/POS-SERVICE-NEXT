import mongoose from 'mongoose';

const UserIndexSchema = new mongoose.Schema({
  emailHash: {
    type: String,
    required: true,
    index: true,
  },
  tenantId: {
    type: String,
    required: true,
  },
  // Empresa dueña de la sede a la que apunta esta entrada. Permite agrupar en
  // el login cuando un mismo email (el dueño) existe en varias sedes.
  companyId: {
    type: String,
    default: null,
    index: true,
  },
}, { timestamps: true });

UserIndexSchema.index({ emailHash: 1, tenantId: 1 }, { unique: true });

export function UserIndexModel(conn) {
  return conn.model('UserIndex', UserIndexSchema);
}

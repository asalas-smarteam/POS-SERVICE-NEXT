import mongoose from 'mongoose';

// Identidad del dueno de una empresa. Vive UNA sola vez en la master DB
// (plano de control), separada de los usuarios operativos de cada sede.
const CompanyUserSchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    index: true,
  },
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
  },
  emailHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    default: '',
  },
  role: {
    type: String,
    default: 'OWNER',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
}, { timestamps: true });

export function CompanyUserModel(conn) {
  return conn.model('CompanyUser', CompanyUserSchema);
}

import mongoose from 'mongoose';
import { ROLE_VALUES } from '@/lib/auth/roles';

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  passwordHash: { type: String, required: true },
  role: {
    type: String,
    enum: ROLE_VALUES,
    required: true,
    default: 'CASHIER',
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  language: {
    type: String,
    default: 'es',
  },
}, { timestamps: true });

export function UserModel(conn) {
  return conn.model('User', UserSchema);
}

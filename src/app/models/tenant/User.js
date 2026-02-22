import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, sparse: true },
  email: { type: String, unique: true, sparse: true },
  passwordHash: String,
  password: String,
  role: {
    type: String,
    enum: ['ADMIN', 'CASHIER', 'KITCHEN'],
  },
}, { timestamps: true });

export function UserModel(conn) {
  return conn.model('User', UserSchema);
}

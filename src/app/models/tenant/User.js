import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true },
  password: String,
  role: {
    type: String,
    enum: ['ADMIN', 'CAJERO', 'COCINA'],
  },
}, { timestamps: true });

export function UserModel(conn) {
  return conn.model('User', UserSchema);
}

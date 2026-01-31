import mongoose from 'mongoose';

const RoleSchema = new mongoose.Schema({
  name: {
    type: String,
    enum: ['ADMIN', 'CAJERO', 'COCINA'],
    unique: true,
  },
}, { timestamps: true });

export function RoleModel(conn) {
  return conn.model('Role', RoleSchema);
}

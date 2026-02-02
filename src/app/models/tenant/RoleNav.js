import mongoose from 'mongoose';

const NavItemSchema = new mongoose.Schema({
  label: String,
  href: String,
  icon: String,
}, { _id: false });

const RoleNavSchema = new mongoose.Schema({
  role: {
    type: String,
    enum: ['ADMIN', 'CAJERO', 'COCINA'],
    unique: true,
  },
  navItems: [NavItemSchema],
}, { timestamps: true });

export function RoleNavModel(conn) {
  return conn.model('RoleNav', RoleNavSchema);
}

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
}, { timestamps: true });

UserIndexSchema.index({ emailHash: 1, tenantId: 1 }, { unique: true });

export function UserIndexModel(conn) {
  return conn.model('UserIndex', UserIndexSchema);
}

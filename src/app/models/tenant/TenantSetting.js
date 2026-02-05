import mongoose from 'mongoose';

const TenantSettingSchema = new mongoose.Schema(
  {
    description: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    data: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
  },
  { timestamps: true }
);

export function TenantSettingModel(conn) {
  return conn.model('TenantSetting', TenantSettingSchema, 'tenant_settings');
}

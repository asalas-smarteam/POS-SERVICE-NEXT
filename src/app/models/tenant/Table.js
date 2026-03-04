import mongoose from 'mongoose';

const TableSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    x: { type: Number, required: true, default: 0 },
    y: { type: Number, required: true, default: 0 },
    size: { type: Number, required: true, default: 80 },
    status: {
      type: String,
      enum: ['available', 'reserved', 'occupied'],
      default: 'available',
    },
  },
  { timestamps: true }
);

export function TableModel(conn) {
  return conn.models.Table || conn.model('Table', TableSchema);
}


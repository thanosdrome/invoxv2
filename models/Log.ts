// ====================================
// models/Log.ts
// ====================================
import mongoose, { Schema, Document } from 'mongoose';

export interface ILog extends Document {
  userId?: mongoose.Types.ObjectId;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
  createdAt: Date;
}

const LogSchema = new Schema<ILog>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User' },
    action: { type: String, required: true },
    entity: { type: String, required: true },
    entityId: String,
    description: { type: String, required: true },
    ipAddress: String,
  },
  { timestamps: true }
);

export default mongoose.models.Log || mongoose.model<ILog>('Log', LogSchema);

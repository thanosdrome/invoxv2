// ====================================
// models/Setting.ts
// ====================================
import mongoose, { Schema, Document } from 'mongoose';

export interface ISetting extends Document {
  companyName: string;
  companyAddress: string;
  companyEmail: string;
  companyPhone: string;
  logoUrl?: string;
  invoicePrefix: string;
  taxRate: number;
  termsText: string;
  createdAt: Date;
  updatedAt: Date;
}

const SettingSchema = new Schema<ISetting>(
  {
    companyName: { type: String, required: true },
    companyAddress: { type: String, required: true },
    companyEmail: { type: String, required: true },
    companyPhone: { type: String, required: true },
    logoUrl: String,
    invoicePrefix: { type: String, default: 'INV' },
    taxRate: { type: Number, default: 0 },
    termsText: { type: String, default: 'Payment due within 30 days.' },
  },
  { timestamps: true }
);

export default mongoose.models.Setting || mongoose.model<ISetting>('Setting', SettingSchema);
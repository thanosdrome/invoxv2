// ====================================
// models/Invoice.ts
// ====================================
import mongoose, { Schema, Document } from 'mongoose';

export interface ILineItem {
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string;
  createdBy: mongoose.Types.ObjectId;
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  lineItems: ILineItem[];
  subtotal: number;
  tax: number;
  discount: number;
  grandTotal: number;
  status: 'draft' | 'signed' | 'cancelled';
  signedBy?: mongoose.Types.ObjectId;
  signedAt?: Date;
  signatureId?: mongoose.Types.ObjectId;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientAddress: { type: String, required: true },
    lineItems: [
      {
        description: String,
        quantity: Number,
        rate: Number,
        total: Number,
      },
    ],
    subtotal: { type: Number, required: true },
    tax: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    status: { type: String, enum: ['draft', 'signed', 'cancelled'], default: 'draft' },
    signedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    signedAt: Date,
    signatureId: { type: Schema.Types.ObjectId, ref: 'Signature' },
    pdfUrl: String,
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

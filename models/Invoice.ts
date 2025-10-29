// ====================================
// models/Invoice.ts - UPDATED
// Enhanced Invoice Model with GST Features
// ====================================
import mongoose, { Schema, Document } from 'mongoose';

export interface ILineItem {
  description: string;
  hsnCode: string; // NEW: HSN/SAC Code
  quantity: number;
  rate: number;
  total: number;
}

export interface IInvoice extends Document {
  invoiceNumber: string; // Now editable
  orderReferenceNumber?: string; // NEW: PO/Order reference
  createdBy: mongoose.Types.ObjectId;
  
  // Client info
  clientName: string;
  clientEmail: string;
  clientAddress: string;
  clientGSTNumber?: string; // NEW: Client GST number
  
  // Line items with HSN
  lineItems: ILineItem[];
  
  // Tax calculation
  subtotal: number;
  taxType: 'IGST' | 'CGST_SGST'; // NEW: Tax type
  igst?: number; // 18% for inter-state
  cgst?: number; // 9% for intra-state
  sgst?: number; // 9% for intra-state
  totalTax: number;
  discount: number;
  grandTotal: number;
  
  // Status and signing
  status: 'draft' | 'signed' | 'cancelled';
  signedBy?: mongoose.Types.ObjectId;
  signedAt?: Date;
  signatureId?: mongoose.Types.ObjectId;
  signatureImageUrl?: string; // NEW: Digital signature image
  pdfUrl?: string;
  
  createdAt: Date;
  updatedAt: Date;
}

const InvoiceSchema = new Schema<IInvoice>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    orderReferenceNumber: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    
    // Client info
    clientName: { type: String, required: true },
    clientEmail: { type: String, required: true },
    clientAddress: { type: String, required: true },
    clientGSTNumber: { type: String },
    
    // Line items
    lineItems: [
      {
        description: { type: String, required: true },
        hsnCode: { type: String, required: true },
        quantity: { type: Number, required: true },
        rate: { type: Number, required: true },
        total: { type: Number, required: true },
      },
    ],
    
    // Tax
    subtotal: { type: Number, required: true },
    taxType: { type: String, enum: ['IGST', 'CGST_SGST'], required: true },
    igst: { type: Number, default: 0 },
    cgst: { type: Number, default: 0 },
    sgst: { type: Number, default: 0 },
    totalTax: { type: Number, required: true },
    discount: { type: Number, default: 0 },
    grandTotal: { type: Number, required: true },
    
    // Status
    status: { type: String, enum: ['draft', 'signed', 'cancelled'], default: 'draft' },
    signedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    signedAt: Date,
    signatureId: { type: Schema.Types.ObjectId, ref: 'Signature' },
    signatureImageUrl: String,
    pdfUrl: String,
  },
  { timestamps: true }
);

export default mongoose.models.Invoice || mongoose.model<IInvoice>('Invoice', InvoiceSchema);

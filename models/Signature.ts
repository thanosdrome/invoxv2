// ====================================
// models/Signature.ts
// ====================================
import mongoose, { Schema, Document } from 'mongoose';

export interface ISignature extends Document {
  userId: mongoose.Types.ObjectId;
  invoiceId: mongoose.Types.ObjectId;
  webAuthnChallengeId: string;
  verified: boolean;
  verifiedAt?: Date;
  signatureText: string;
  timestamp: Date;
  createdAt: Date;
}

const SignatureSchema = new Schema<ISignature>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    invoiceId: { type: Schema.Types.ObjectId, ref: 'Invoice', required: true },
    webAuthnChallengeId: { type: String, required: true },
    verified: { type: Boolean, default: false },
    verifiedAt: Date,
    signatureText: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export default mongoose.models.Signature || mongoose.model<ISignature>('Signature', SignatureSchema);

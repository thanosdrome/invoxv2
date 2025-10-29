// ====================================
// models/User.ts - UPDATED
// Add signature image URL to User
// ====================================
import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  passwordHash: string;
  role: 'admin' | 'user';
  webAuthnCredential?: {
    credentialID: string;
    credentialPublicKey: string;
    counter: number;
    transports?: string[];
  };
  signatureImageUrl?: string; // Digital signature image
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['admin', 'user'], default: 'user' },
    webAuthnCredential: {
      credentialID: String,
      credentialPublicKey: String,
      counter: Number,
      transports: [String],
    },
    signatureImageUrl: String, // Store uploaded signature image path
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

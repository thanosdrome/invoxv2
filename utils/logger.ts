// ====================================
// utils/logger.ts - Logging Utility
// ====================================
import Log from '@/models/Log';
import dbConnect from '@/lib/db';

export async function createLog(data: {
  userId?: string;
  action: string;
  entity: string;
  entityId?: string;
  description: string;
  ipAddress?: string;
}) {
  try {
    await dbConnect();
    await Log.create(data);
  } catch (error) {
    console.error('Failed to create log:', error);
  }
}

export const LogActions = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  INVOICE_CREATED: 'INVOICE_CREATED',
  INVOICE_UPDATED: 'INVOICE_UPDATED',
  INVOICE_DELETED: 'INVOICE_DELETED',
  INVOICE_SIGNED: 'INVOICE_SIGNED',
  PDF_GENERATED: 'PDF_GENERATED',
  WEBAUTHN_REGISTERED: 'WEBAUTHN_REGISTERED',
  WEBAUTHN_VERIFIED: 'WEBAUTHN_VERIFIED',
} as const;
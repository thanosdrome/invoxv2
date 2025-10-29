// ====================================
// app/api/invoices/[id]/sign/route.ts
// Invoice Digital Signing with WebAuthn
// ====================================

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Signature from '@/models/Signature';
import User from '@/models/User';
import Setting from '@/models/Setting';
import { createLog, LogActions } from '@/utils/logger';
import { generateAuthenticationChallenge, verifyAuthentication } from '@/lib/webauthn';
import type { AuthenticationResponseJSON } from '@simplewebauthn/types';
import { generateInvoicePDFWithGST, savePDF } from '@/utils/pdf';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Validation schemas
const initSignSchema = z.object({
  step: z.literal('init'),
});

const verifySignSchema = z.object({
  step: z.literal('verify'),
  signatureId: z.string(),
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    response: z.object({
      authenticatorData: z.string(),
      clientDataJSON: z.string(),
      signature: z.string(),
      userHandle: z.string().optional(),
    }),
    type: z.literal('public-key'),
    clientExtensionResults: z.any().optional(),
  }),
});

/**
 * Helper: Extract user from JWT token
 */
function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  
  if (!token) {
    throw new Error('Unauthorized - No token provided');
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      role: string;
    };
    return decoded;
  } catch (error) {
    throw new Error('Unauthorized - Invalid or expired token');
  }
}

/**
 * Helper: Get client IP address
 */
function getClientIP(req: NextRequest): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0] ||
    req.headers.get('x-real-ip') ||
    'unknown'
  );
}

/**
 * POST - Sign an invoice with WebAuthn
 * 
 * Two-step process:
 * 1. Init: Generate WebAuthn challenge and create signature record
 * 2. Verify: Verify WebAuthn response and complete signing
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  try {
    await dbConnect();
    
    // Authenticate user
    const user = getUserFromToken(req);
    const ipAddress = getClientIP(req);
    
    // Parse request body
    const body = await req.json();
    const { step } = body;
    const { id } = await params;
    // Validate invoice exists
    const invoice = await Invoice.findById(id);
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Check if invoice is already signed
    if (invoice.status === 'signed') {
      return NextResponse.json(
        { error: 'Invoice is already signed' },
        { status: 400 }
      );
    }
    
    // Check if invoice is cancelled
    if (invoice.status === 'cancelled') {
      return NextResponse.json(
        { error: 'Cannot sign a cancelled invoice' },
        { status: 400 }
      );
    }
    
    // ============================================
    // STEP 1: Initialize Signing Process
    // ============================================
    if (step === 'init') {
      try {
        initSignSchema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Invalid request format', details: error.errors },
            { status: 400 }
          );
        }
        throw error;
      }
      
      // Get user with WebAuthn credentials
      const userDoc = await User.findById(user.userId);
      
      if (!userDoc) {
        return NextResponse.json(
          { error: 'User not found' },
          { status: 404 }
        );
      }
      
      // Verify user has WebAuthn configured
      if (!userDoc.webAuthnCredential) {
        return NextResponse.json(
          { 
            error: 'WebAuthn not configured',
            message: 'Please register a security key or biometric authentication first'
          },
          { status: 400 }
        );
      }
      
      // Generate WebAuthn authentication challenge
      const options = await generateAuthenticationChallenge(user.userId);
      
      // Create signature record with pending status
      const signature = await Signature.create({
        userId: user.userId,
        invoiceId: id,
        webAuthnChallengeId: options.challenge,
        signatureText: `Digitally signed by ${userDoc.name}`,
        verified: false,
        timestamp: new Date(),
      });
      
      // Log signing initiation
      await createLog({
        userId: user.userId,
        action: 'INVOICE_SIGN_INITIATED',
        entity: 'invoice',
        entityId: id,
        description: `Signing initiated for invoice: ${invoice.invoiceNumber}`,
        ipAddress,
      });
      
      return NextResponse.json({
        success: true,
        signatureId: signature._id.toString(),
        options,
        credentialId: userDoc.webAuthnCredential.credentialID,
        message: 'Please authenticate with your security key or biometric',
      });
    }
    
    // ============================================
    // STEP 2: Verify and Complete Signing
    // ============================================
    if (step === 'verify') {
      let validatedData;
      try {
        validatedData = verifySignSchema.parse(body);
      } catch (error) {
        if (error instanceof z.ZodError) {
          return NextResponse.json(
            { error: 'Invalid request format', details: error.errors },
            { status: 400 }
          );
        }
        throw error;
      }
      
      const { signatureId, credential } = validatedData;
      
      // Get signature record
      const signature = await Signature.findById(signatureId);
      
      if (!signature) {
        return NextResponse.json(
          { error: 'Signature record not found' },
          { status: 404 }
        );
      }
      
      // Verify signature belongs to current user and invoice
      if (signature.userId.toString() !== user.userId) {
        return NextResponse.json(
          { error: 'Signature does not belong to current user' },
          { status: 403 }
        );
      }
      
      if (signature.invoiceId.toString() !== id) {
        return NextResponse.json(
          { error: 'Signature does not match invoice' },
          { status: 400 }
        );
      }
      
      // Check if signature is already verified
      if (signature.verified) {
        return NextResponse.json(
          { error: 'Signature already verified' },
          { status: 400 }
        );
      }
      
      // Get user with WebAuthn credentials
      const userDoc = await User.findById(user.userId);
      
      if (!userDoc || !userDoc.webAuthnCredential) {
        return NextResponse.json(
          { error: 'User or WebAuthn credential not found' },
          { status: 404 }
        );
      }
      
      // Convert stored credential data from base64
      const credentialPublicKey = Buffer.from(
        userDoc.webAuthnCredential.credentialPublicKey,
        'base64'
      );
      const credentialID = Buffer.from(
        userDoc.webAuthnCredential.credentialID,
        'base64'
      );
      // Verify WebAuthn authentication
      let verification;
      try {
        // Ensure clientExtensionResults exists and shape matches AuthenticationResponseJSON
        const authResponse = {
          ...credential,
          clientExtensionResults: (credential as any).clientExtensionResults ?? {},
        } as unknown as AuthenticationResponseJSON;

        verification = await verifyAuthentication(
          user.userId,
          authResponse,
          credentialPublicKey,
          credentialID,
          userDoc.webAuthnCredential.counter
        );
      } catch (error) {
        // Log failed verification
        await createLog({
          userId: user.userId,
          action: 'INVOICE_SIGN_FAILED',
          entity: 'invoice',
          entityId: id,
          description: `WebAuthn verification failed for invoice: ${invoice.invoiceNumber}`,
          ipAddress,
        });
        
        return NextResponse.json(
          { 
            error: 'Signature verification failed',
            message: 'Authentication failed'
          },
          { status: 401 }
        );
      }
      
      // Check if verification was successful
      if (!verification.verified) {
        await createLog({
          userId: user.userId,
          action: 'INVOICE_SIGN_FAILED',
          entity: 'invoice',
          entityId: id,
          description: `Signature verification failed for invoice: ${invoice.invoiceNumber}`,
          ipAddress,
        });
        
        return NextResponse.json(
          { error: 'Signature verification failed' },
          { status: 401 }
        );
      }
      
      // Update authenticator counter to prevent replay attacks
      await User.findByIdAndUpdate(user.userId, {
        'webAuthnCredential.counter': verification.authenticationInfo.newCounter,
      });
      
      // Mark signature as verified
      signature.verified = true;
      signature.verifiedAt = new Date();
      await signature.save();
      
      // Update invoice status
      invoice.status = 'signed';
      invoice.signedBy = user.userId;
      invoice.signedAt = new Date();
      invoice.signatureId = signature._id;
      
      // Get company settings for PDF generation
      let settings = await Setting.findOne();
      
      // Use default settings if none exist
      if (!settings) {
        settings = {
          companyName: 'Your Company',
          companyAddress: '123 Business Street, City, State 12345',
          companyEmail: 'contact@company.com',
          companyPhone: '(555) 123-4567',
          invoicePrefix: 'INV',
          taxRate: 0,
          termsText: 'Payment due within 30 days. Late payments may incur additional fees.',
        } as any;
      }
      
      // Generate PDF
      let pdfUrl = '';
      try {
        const pdfBuffer = await generateInvoicePDFWithGST(
          invoice,
          settings,
          userDoc.name,
          invoice.signedAt
        );
        
        pdfUrl = await savePDF(pdfBuffer, invoice.invoiceNumber);
        invoice.pdfUrl = pdfUrl;
        
        // Log PDF generation
        await createLog({
          userId: user.userId,
          action: LogActions.PDF_GENERATED,
          entity: 'invoice',
          entityId: id,
          description: `PDF generated for invoice: ${invoice.invoiceNumber}`,
          ipAddress,
        });
      } catch (pdfError) {
        console.error('PDF generation error:', pdfError);
        // Continue even if PDF generation fails
        const pdfErrorMessage = pdfError instanceof Error ? pdfError.message : String(pdfError);
        await createLog({
          userId: user.userId,
          action: 'PDF_GENERATION_FAILED',
          entity: 'invoice',
          entityId: id,
          description: `PDF generation failed for invoice: ${invoice.invoiceNumber} - ${pdfErrorMessage}`,
          ipAddress,
        });
      }
      
      // Save updated invoice
      // Ensure tax fields exist (handle invoices created before tax fields were required)
      try {
        const lineItems = invoice.lineItems || [];
        const subtotal = Array.isArray(lineItems)
          ? lineItems.reduce((s: number, it: any) => s + (it.total || 0), 0)
          : 0;

        const taxType = invoice.taxType || 'IGST';
        let igst = invoice.igst ?? 0;
        let cgst = invoice.cgst ?? 0;
        let sgst = invoice.sgst ?? 0;
        let totalTax = invoice.totalTax ?? 0;

        // Recalculate if missing or zero
        if (!totalTax) {
          if (taxType === 'IGST') {
            igst = subtotal * 0.18;
            cgst = 0;
            sgst = 0;
            totalTax = igst;
          } else {
            cgst = subtotal * 0.09;
            sgst = subtotal * 0.09;
            igst = 0;
            totalTax = cgst + sgst;
          }
        }

        invoice.subtotal = subtotal;
        invoice.taxType = taxType;
        invoice.igst = igst;
        invoice.cgst = cgst;
        invoice.sgst = sgst;
        invoice.totalTax = totalTax;
        invoice.discount = invoice.discount || 0;
        invoice.grandTotal = (subtotal || 0) + (totalTax || 0) - (invoice.discount || 0);
      } catch (calcErr) {
        console.warn('Failed to recalculate tax fields for invoice before save:', calcErr);
      }

      await invoice.save();
      
      // Log successful signing
      await createLog({
        userId: user.userId,
        action: LogActions.INVOICE_SIGNED,
        entity: 'invoice',
        entityId: id,
        description: `Invoice signed successfully: ${invoice.invoiceNumber}`,
        ipAddress,
      });
      
      // Populate user details for response
            let populatedInvoice = await Invoice.findById(id)
              .populate('createdBy', 'name email')
              .populate('signedBy', 'name email')
              .lean();
            
            // Defensive: sometimes mongoose typings (or drivers) can produce an array; normalize to a single document
            if (Array.isArray(populatedInvoice)) {
              populatedInvoice = populatedInvoice[0] ?? null;
            }
            
            if (!populatedInvoice) {
              return NextResponse.json(
                { error: 'Invoice not found after population' },
                { status: 404 }
              );
            }
            
            // Cast to any so TypeScript won't complain about the shape returned by .lean()
            const invoiceObj: any = populatedInvoice;
            
            return NextResponse.json({
              success: true,
              message: 'Invoice signed successfully',
              invoice: {
                id: invoiceObj._id,
                invoiceNumber: invoiceObj.invoiceNumber,
                status: invoiceObj.status,
                signedBy: invoiceObj.signedBy,
                signedAt: invoiceObj.signedAt,
                pdfUrl: invoiceObj.pdfUrl,
                grandTotal: invoiceObj.grandTotal,
              },
              signature: {
                id: signature._id,
                verified: signature.verified,
                verifiedAt: signature.verifiedAt,
                signatureText: signature.signatureText,
              },
            });
    }
    
    // Invalid step
    return NextResponse.json(
      { error: 'Invalid step. Must be "init" or "verify"' },
      { status: 400 }
    );
    
  } catch (error: any) {
    console.error('Invoice signing error:', error);
    
    // Handle JWT errors
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    // Generic error response
    return NextResponse.json(
      { 
        error: 'Failed to sign invoice',
        message: error.message || 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Get signature details for an invoice
 */
export async function GET (
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> } // Add Promise wrapper
) {
  try {
    await dbConnect();
    
    // Authenticate user
    const user = getUserFromToken(req);
    const {id} = await params;
    // Get invoice with signature details
    let invoice: any = await Invoice.findById(id)
      .populate('signatureId')
      .populate('signedBy', 'name email')
      .lean();
    
    // Defensive: normalize if mongoose/driver returns an array for some reason
    if (Array.isArray(invoice)) {
      invoice = invoice[0] ?? null;
    }
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Check permissions
    // createdBy may be an ObjectId or a populated object; handle both safely
    const createdById = invoice.createdBy?._id ?? invoice.createdBy;
    if (user.role !== 'admin' && createdById?.toString() !== user.userId) {
      return NextResponse.json(
        { error: 'Forbidden - You do not have access to this invoice' },
        { status: 403 }
      );
    }
    
    return NextResponse.json({
      success: true,
      signature: invoice.signatureId,
      signedBy: invoice.signedBy,
      signedAt: invoice.signedAt,
      status: invoice.status,
    });
    
  } catch (error: any) {
    console.error('Get signature error:', error);
    
    if (error.message?.includes('Unauthorized')) {
      return NextResponse.json(
        { error: error.message },
        { status: 401 }
      );
    }
    
    return NextResponse.json(
      { error: 'Failed to get signature details' },
      { status: 500 }
    );
  }
}
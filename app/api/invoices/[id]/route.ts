// ====================================
// app/api/invoices/[id]/sign/route.ts
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import Invoice from '@/models/Invoice';
import Signature from '@/models/Signature';
import User from '@/models/User';
import Setting from '@/models/Setting';
import { createLog, LogActions } from '@/utils/logger';
import { generateAuthenticationChallenge, verifyAuthentication } from '@/lib/webauthn';
import { generateInvoicePDF, savePDF } from '@/utils/pdf';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET) as any;
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const user = getUserFromToken(req);
    const body = await req.json();
    const { step } = body;
    
    const invoice = await Invoice.findById(params.id);
    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }
    
    if (invoice.status === 'signed') {
      return NextResponse.json({ error: 'Invoice already signed' }, { status: 400 });
    }
    
    // Step 1: Generate signing challenge
    if (step === 'init') {
      const userDoc = await User.findById(user.userId);
      if (!userDoc?.webAuthnCredential) {
        return NextResponse.json({ error: 'WebAuthn not configured' }, { status: 400 });
      }
      
      const options = await generateAuthenticationChallenge(user.userId);
      
      // Create signature record with challenge
      const signature = await Signature.create({
        userId: user.userId,
        invoiceId: params.id,
        webAuthnChallengeId: options.challenge,
        signatureText: `Signed by ${userDoc.name}`,
        verified: false,
      });
      
      return NextResponse.json({
        signatureId: signature._id,
        options,
        credentialId: userDoc.webAuthnCredential.credentialID,
      });
    }
    
    // Step 2: Verify signature and complete signing
    if (step === 'verify') {
      const { signatureId, credential } = body;
      
      const signature = await Signature.findById(signatureId);
      if (!signature) {
        return NextResponse.json({ error: 'Signature not found' }, { status: 404 });
      }
      
      const userDoc = await User.findById(user.userId);
      if (!userDoc?.webAuthnCredential) {
        return NextResponse.json({ error: 'WebAuthn not configured' }, { status: 400 });
      }
      
      const credentialPublicKey = Buffer.from(userDoc.webAuthnCredential.credentialPublicKey, 'base64');
      const credentialID = Buffer.from(userDoc.webAuthnCredential.credentialID, 'base64');
      
      const verification = await verifyAuthentication(
        user.userId,
        credential,
        credentialPublicKey,
        credentialID,
        userDoc.webAuthnCredential.counter
      );
      
      if (!verification.verified) {
        return NextResponse.json({ error: 'Signature verification failed' }, { status: 401 });
      }
      
      // Update counter
      await User.findByIdAndUpdate(user.userId, {
        'webAuthnCredential.counter': verification.authenticationInfo.newCounter,
      });
      
      // Mark signature as verified
      signature.verified = true;
      signature.verifiedAt = new Date();
      await signature.save();
      
      // Update invoice
      invoice.status = 'signed';
      invoice.signedBy = user.userId;
      invoice.signedAt = new Date();
      invoice.signatureId = signature._id;
      
      // Generate PDF
      const settings = await Setting.findOne() || {
        companyName: 'Your Company',
        companyAddress: '123 Business St',
        companyEmail: 'contact@company.com',
        companyPhone: '555-0000',
        termsText: 'Payment due within 30 days.',
      };
      
      const pdfBuffer = await generateInvoicePDF(
        invoice,
        settings,
        userDoc.name,
        invoice.signedAt
      );
      
      const pdfUrl = await savePDF(pdfBuffer, invoice.invoiceNumber);
      invoice.pdfUrl = pdfUrl;
      
      await invoice.save();
      
      await createLog({
        userId: user.userId,
        action: LogActions.INVOICE_SIGNED,
        entity: 'invoice',
        entityId: params.id,
        description: `Invoice signed: ${invoice.invoiceNumber}`,
        ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      });
      
      await createLog({
        userId: user.userId,
        action: LogActions.PDF_GENERATED,
        entity: 'invoice',
        entityId: params.id,
        description: `PDF generated for invoice: ${invoice.invoiceNumber}`,
        ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      });
      
      return NextResponse.json({
        success: true,
        invoice: {
          id: invoice._id,
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          pdfUrl: invoice.pdfUrl,
          signedAt: invoice.signedAt,
        },
      });
    }
    
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error) {
    console.error('Sign invoice error:', error);
    return NextResponse.json({ error }, { status: 400 });
  }
}
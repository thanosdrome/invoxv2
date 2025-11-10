// ====================================
// app/api/auth/register/route.ts
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { createLog, LogActions } from '@/utils/logger';
import { generateRegistrationChallenge, verifyRegistration } from '@/lib/webauthn';

// Define the proper WebAuthn types
type AuthenticatorTransportFuture = 
  | 'usb' 
  | 'nfc' 
  | 'ble' 
  | 'smart-card' 
  | 'hybrid' 
  | 'internal';

type AuthenticatorAttachment =
  | 'platform'
  | 'cross-platform';

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']).optional(),
});

// Fixed verifySchema with all proper types
const verifySchema = z.object({
  tempId: z.string().min(1, "Temporary ID is required"),
  credential: z.object({
    id: z.string(),
    rawId: z.string(),
    type: z.literal("public-key"),
    response: z.object({
      clientDataJSON: z.string(),
      attestationObject: z.string(),
      transports: z.array(z.enum(['usb', 'nfc', 'ble', 'smart-card', 'hybrid', 'internal'])).optional(),
    }),
    clientExtensionResults: z.object({}).optional(),
    authenticatorAttachment: z.enum(['platform', 'cross-platform']).optional(),
  }),
  pendingRegistration: z.object({
    name: z.string(),
    email: z.string().email(),
    passwordHash: z.string(),
    role: z.enum(['admin', 'user']).optional(),
  }),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { step } = body;
    
    console.log('Registration request:', { step, body: JSON.stringify(body, null, 2) });

    // Step 1: Create user and generate WebAuthn challenge
    if (step === 'init') {
      const { name, email, password, role } = registerSchema.parse(body);
      
      const existing = await User.findOne({ email });
      if (existing) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      // Create a temporary user ID without storing in database yet
      const tempId = new User()._id.toString(); // Use _id instead of id
      
      // Generate WebAuthn challenge with temporary ID
      const options = await generateRegistrationChallenge(
        tempId,
        name,
        email
      );
      
      // Store registration data in response without creating user yet
      return NextResponse.json({ 
        tempId,
        options,
        pendingRegistration: {
          name,
          email,
          passwordHash,
          role: role || 'user'
        }
      });
    }
    
    // Step 2: Verify WebAuthn credential and create user
    if (step === 'verify') {
      console.log('Verify step - received body:', JSON.stringify(body, null, 2));
      
      // Use safeParse for better error handling
      const result = verifySchema.safeParse(body);
      
      if (!result.success) {
        console.error('Validation error details:', {
          errors: result.error.errors,
          receivedBody: body
        });
        
        return NextResponse.json(
          { 
            error: 'Invalid verification data',
            details: result.error.errors.map(err => ({
              field: err.path.join('.'),
              message: err.message
            }))
          },
          { status: 400 }
        );
      }
      
      const { tempId, credential, pendingRegistration } = result.data;
      
      console.log('Parsed verification data:', { tempId, pendingRegistration });
      
      // Transform the credential to match the exact expected type
      const transformedCredential = {
        id: credential.id,
        rawId: credential.rawId,
        type: credential.type,
        response: {
          clientDataJSON: credential.response.clientDataJSON,
          attestationObject: credential.response.attestationObject,
          transports: credential.response.transports as AuthenticatorTransportFuture[] | undefined,
        },
        clientExtensionResults: credential.clientExtensionResults || {},
        authenticatorAttachment: credential.authenticatorAttachment as AuthenticatorAttachment | undefined,
      };
      
      const verification = await verifyRegistration(tempId, transformedCredential);
      
      if (!verification.verified) {
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }
      
      const regInfo = verification.registrationInfo;
      if (!regInfo) {
        return NextResponse.json({ error: 'Missing registration info' }, { status: 400 });
      }
      
      // Only create user after successful WebAuthn verification
      const user = await User.create({
        ...pendingRegistration,
        webAuthnCredential: {
          credentialID: Buffer.from(regInfo.credentialID).toString('base64'),
          credentialPublicKey: Buffer.from(regInfo.credentialPublicKey).toString('base64'),
          counter: regInfo.counter,
        }
      });
      
      await createLog({
        userId: user._id.toString(),
        action: LogActions.REGISTER_SUCCESS,
        entity: 'user',
        entityId: user._id.toString(),
        description: `User registered: ${pendingRegistration.email}`,
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });
      
      await createLog({
        userId: user._id.toString(),
        action: LogActions.WEBAUTHN_REGISTERED,
        entity: 'user',
        entityId: user._id.toString(),
        description: 'WebAuthn credential registered',
        ipAddress: req.headers.get('x-forwarded-for') || undefined,
      });
      
      return NextResponse.json({ success: true, user: { id: user._id, name: user.name, email: user.email } });
    }
    
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error) {
    console.error('Register error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || 'Registration failed' }, { status: 400 });
  }
}
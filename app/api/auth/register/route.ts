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

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(8),
  role: z.enum(['admin', 'user']).optional(),
});

const verifySchema = z.object({
  userId: z.string(),
  credential: z.any(),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { step } = body;
    
    // Step 1: Create user and generate WebAuthn challenge
    if (step === 'init') {
      const { name, email, password, role } = registerSchema.parse(body);
      
      const existing = await User.findOne({ email });
      if (existing) {
        return NextResponse.json({ error: 'User already exists' }, { status: 400 });
      }
      
      const passwordHash = await bcrypt.hash(password, 10);
      
      const user = await User.create({
        name,
        email,
        passwordHash,
        role: role || 'user',
      });
      
      const options = await generateRegistrationChallenge(
        user._id.toString(),
        user.name,
        user.email
      );
      
      await createLog({
        userId: user._id.toString(),
        action: LogActions.REGISTER_SUCCESS,
        entity: 'user',
        entityId: user._id.toString(),
        description: `User registered: ${email}`,
        ipAddress: req.headers.get('x-forwarded-for') || req.ip,
      });
      
      return NextResponse.json({ userId: user._id, options });
    }
    
    // Step 2: Verify WebAuthn credential
    if (step === 'verify') {
      const { userId, credential } = verifySchema.parse(body);
      
      const verification = await verifyRegistration(userId, credential);
      
      if (!verification.verified) {
        return NextResponse.json({ error: 'Verification failed' }, { status: 400 });
      }
      
      const regInfo = verification.registrationInfo;
      if (!regInfo) {
        return NextResponse.json({ error: 'Missing registration info' }, { status: 400 });
      }
      
      const user = await User.findByIdAndUpdate(
        userId,
        {
          webAuthnCredential: {
            credentialID: Buffer.from(regInfo.credentialID).toString('base64'),
            credentialPublicKey: Buffer.from(regInfo.credentialPublicKey).toString('base64'),
            counter: regInfo.counter,
          },
        },
        { new: true }
      );
      
      if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      
      await createLog({
        userId: user._id.toString(),
        action: LogActions.WEBAUTHN_REGISTERED,
        entity: 'user',
        entityId: user._id.toString(),
        description: 'WebAuthn credential registered',
        ipAddress: req.headers.get('x-forwarded-for') || req.ip,
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

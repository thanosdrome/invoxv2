// ====================================
// app/api/auth/login/route.ts
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { unknown, z } from 'zod';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { createLog, LogActions } from '@/utils/logger';
import { generateAuthenticationChallenge, verifyAuthentication } from '@/lib/webauthn';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const loginInitSchema = z.object({
  email: z.string().email(),
});

const loginVerifySchema = z.object({
  userId: z.string(),
  credential: z.any(),
});

export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    const body = await req.json();
    const { step } = body;
    
    // Step 1: Generate WebAuthn challenge
    if (step === 'init') {
      const { email } = loginInitSchema.parse(body);
      
      const user = await User.findOne({ email });
      if (!user || !user.webAuthnCredential) {
        await createLog({
          action: LogActions.LOGIN_FAILED,
          entity: 'user',
          description: `Login failed: ${email}`,
          ipAddress: req.headers.get('x-forwarded-for') || "unknown",
        });
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      
      const options = await generateAuthenticationChallenge(user._id.toString());
      
      return NextResponse.json({ 
        userId: user._id.toString(),
        options,
        credentialId: user.webAuthnCredential.credentialID 
      });
    }
    
    // Step 2: Verify WebAuthn credential
    if (step === 'verify') {
      const { userId, credential } = loginVerifySchema.parse(body);
      
      const user = await User.findById(userId);
      if (!user || !user.webAuthnCredential) {
        return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
      }
      
      const credentialPublicKey = Buffer.from(user.webAuthnCredential.credentialPublicKey, 'base64');
      const credentialID = Buffer.from(user.webAuthnCredential.credentialID, 'base64');
      
      const verification = await verifyAuthentication(
        userId,
        credential,
        credentialPublicKey,
        credentialID,
        user.webAuthnCredential.counter
      );
      
      if (!verification.verified) {
        await createLog({
          userId: user._id.toString(),
          action: LogActions.LOGIN_FAILED,
          entity: 'user',
          entityId: user._id.toString(),
          description: 'WebAuthn verification failed',
          ipAddress: req.headers.get('x-forwarded-for') || "unknown",
        });
        return NextResponse.json({ error: 'Verification failed' }, { status: 401 });
      }
      
      // Update counter
      await User.findByIdAndUpdate(userId, {
        'webAuthnCredential.counter': verification.authenticationInfo.newCounter,
      });
      
       const token = jwt.sign(
    { userId: user._id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '7d' }
    );
    
    const response = NextResponse.json({
      success: true,
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
    });
    
      await createLog({
        userId: user._id.toString(),
        action: LogActions.LOGIN_SUCCESS,
        entity: 'user',
        entityId: user._id.toString(),
        description: `User logged in: ${user.email}`,
        ipAddress: req.headers.get('x-forwarded-for') || "unknown",
      });
      
        // IMPORTANT: Check these cookie settings
      response.cookies.set('auth-token', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production', // false in development!
        sameSite: 'lax', // Changed from 'strict' to 'lax'
        maxAge: 7 * 24 * 60 * 60, // 7 days
        path: '/', // IMPORTANT: Must be '/'
      });
      
      console.log('✓ Login successful, cookie set:', {
        token: token.substring(0, 20) + '...',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
          
      return response;
    }
    
    return NextResponse.json({ error: 'Invalid step' }, { status: 400 });
  } catch (error) {
    console.error('Login error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message || 'Login failed' }, { status: 401 });
  }
}
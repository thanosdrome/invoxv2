// ====================================
// app/api/auth/challenge/route.ts
// WebAuthn Challenge Management Endpoint
// ====================================

import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { generateAuthenticationChallenge } from '@/lib/webauthn';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// Validation schemas
const getChallengeSchema = z.object({
  email: z.string().email(),
  purpose: z.enum(['login', 'sign']).optional(),
});

const verifyChallengeSchema = z.object({
  challengeId: z.string(),
});

/**
 * GET - Generate a new WebAuthn challenge
 * Used for both login and signing operations
 */
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const purpose = searchParams.get('purpose') || 'login';
    
    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }
    
    // Validate input
    const validated = getChallengeSchema.parse({ email, purpose });
    
    // Find user
    const user = await User.findOne({ email: validated.email });
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has WebAuthn configured
    if (!user.webAuthnCredential) {
      return NextResponse.json(
        { error: 'WebAuthn not configured for this user' },
        { status: 400 }
      );
    }
    
    // Generate authentication challenge
    const options = await generateAuthenticationChallenge(user._id.toString());
    
    return NextResponse.json({
      success: true,
      userId: user._id,
      email: user.email,
      purpose: validated.purpose,
      options,
      credentialId: user.webAuthnCredential.credentialID,
      expiresIn: 60, // seconds
    });
    
  } catch (error) {
    console.error('Challenge generation error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.errors },
        { status: 400 }
      );
    }
    
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || 'Failed to generate challenge' },
      { status: 500 }
    );
  }
}

/**
 * POST - Generate challenge for authenticated users
 * Used for signing operations when user is already logged in
 */
export async function POST(req: NextRequest) {
  try {
    await dbConnect();
    
    // Verify user is authenticated
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized - Please login first' },
        { status: 401 }
      );
    }
    
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET) as any;
    } catch {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }
    
    const body = await req.json();
    const { purpose } = body;
    
    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Check if user has WebAuthn configured
    if (!user.webAuthnCredential) {
      return NextResponse.json(
        { error: 'WebAuthn not configured for this user' },
        { status: 400 }
      );
    }
    
    // Generate authentication challenge
    const options = await generateAuthenticationChallenge(user._id.toString());
    
    return NextResponse.json({
      success: true,
      userId: user._id,
      email: user.email,
      name: user.name,
      purpose: purpose || 'sign',
      options,
      credentialId: user.webAuthnCredential.credentialID,
      expiresIn: 60, // seconds
    });
  } catch (error) {
    console.error('Challenge generation error:', error);
    
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || 'Failed to generate challenge' },
      { status: 500 }
    );
  }
  }


/**
 * DELETE - Clear/invalidate a challenge
 * Can be used to cancel an ongoing authentication attempt
 */
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }
    
    // In a production system, you'd clear the challenge from your store
    // For now, this is a placeholder as challenges auto-expire after 60s
    
    return NextResponse.json({
      success: true,
      message: 'Challenge cleared',
  })} catch (error) {
    console.error('Challenge deletion error:', error);
    
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: message || 'Failed to clear challenge' },
      { status: 500 }
    );
  }
}
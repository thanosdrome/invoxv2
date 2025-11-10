// ====================================
// app/api/user/profile/route.ts
// User Profile API
// ====================================
import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import dbConnect from '@/lib/db';
import User from '@/models/User';
import { createLog } from '@/utils/logger';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

const updateProfileSchema = z.object({
  name: z.string().min(2).optional(),
  email: z.string().email().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

function getUserFromToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  if (!token) throw new Error('Unauthorized');
  return jwt.verify(token, JWT_SECRET) as any;
}

// GET - Get current user profile
export async function GET(req: NextRequest) {
  try {
    await dbConnect();
    const tokenUser = getUserFromToken(req);
    
    const user = await User.findById(tokenUser.userId).select('-passwordHash -webAuthnCredential.credentialPublicKey');
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    return NextResponse.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        signatureImageUrl: user.signatureImageUrl,
        hasWebAuthn: !!user.webAuthnCredential,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }
}

// PUT - Update profile
export async function PUT(req: NextRequest) {
  try {
    await dbConnect();
    const tokenUser = getUserFromToken(req);
    const body = await req.json();
    const data = updateProfileSchema.parse(body);
    
    const user = await User.findById(tokenUser.userId);
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Update name
    if (data.name) {
      user.name = data.name;
    }
    
    // Update email (check for uniqueness)
    if (data.email && data.email !== user.email) {
      const existing = await User.findOne({ email: data.email });
      if (existing) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
      }
      user.email = data.email;
    }
    
    // Update password
    if (data.newPassword && data.currentPassword) {
      const isValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
      if (!isValid) {
        return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 });
      }
      user.passwordHash = await bcrypt.hash(data.newPassword, 10);
    }
    
    await user.save();
    
    await createLog({
      userId: user._id.toString(),
      action: 'PROFILE_UPDATED',
      entity: 'user',
      entityId: user._id.toString(),
      description: 'User profile updated',
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
    });
    
    return NextResponse.json({
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
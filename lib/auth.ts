import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import dbConnect from '@/lib/db';
import User from '@/models/User';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

interface UserDocument {
  _id: string;
  email: string;
  role?: string;
  active?: boolean;
}

export interface DecodedToken {
  userId: string;
  email: string;
  role?: string;
  iat: number;
  exp: number;
}

export function createAuthErrorResponse(message: string) {
  const response = NextResponse.json(
    { error: message },
    { status: 401 }
  );
  
  // Clear the invalid token
  response.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
  
  return response;
}

export async function validateToken(req: NextRequest) {
  const token = req.cookies.get('auth-token')?.value;
  
  if (!token) {
    throw new Error('No authentication token provided');
  }
  
  try {
    // First verify the token structure and signature
    const decoded = jwt.verify(token, JWT_SECRET) as DecodedToken;
    
    // Check for required fields
    if (!decoded.userId || !decoded.email) {
      throw new Error('Invalid token structure');
    }

    // Check token expiration
    if (decoded.exp && decoded.exp * 1000 < Date.now()) {
      throw new Error('Token has expired');
    }

    // Verify user exists and is active in database
    await dbConnect();
    const user = await User.findById(decoded.userId)
      .select('_id email role active')
      .lean() as UserDocument | null;
    
    if (!user) {
      throw new Error('User not found');
    }

    if (user.active === false) {
      throw new Error('User account is inactive');
    }

    // Return merged data from token and database
    return {
      ...decoded,
      role: user.role || 'user', // Use database role, fallback to 'user'
      userId: user._id.toString(), // Ensure consistent format
      email: user.email,
      active: user.active
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    }
    throw error;
  }
}

/**
 * Creates a JWT token for a user
 */
export function createToken(user: { _id: string; email: string; role?: string }) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
      role: user.role || 'user'
    },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

/**
 * Sets the authentication token in response cookies
 */
export function setAuthCookie(res: NextResponse, token: string) {
  res.cookies.set('auth-token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 24 * 60 * 60, // 24 hours
  });
}

/**
 * Clears the authentication token from cookies
 */
export function clearAuthCookie(res: NextResponse) {
  res.cookies.set('auth-token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
  });
}
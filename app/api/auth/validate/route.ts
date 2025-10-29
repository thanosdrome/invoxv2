import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function GET(req: NextRequest) {
  try {
    const token = req.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ valid: false }, { status: 401 });
    }

    try {
      jwt.verify(token, JWT_SECRET);
      return NextResponse.json({ valid: true });
    } catch (err) {
      // Invalid token -> clear cookie server-side so clients receive cleared cookie
      const res = NextResponse.json({ valid: false }, { status: 401 });
      res.cookies.set('auth-token', '', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 0,
      });
      return res;
    }
  } catch (error: any) {
    console.error('Token validation error:', error);
    return NextResponse.json({ valid: false, error: String(error) }, { status: 500 });
  }
}

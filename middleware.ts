// ====================================
// middleware.ts - Auth Middleware
// ====================================
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

export async function middleware(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (request.nextUrl.pathname.startsWith('/pdfs/')) {
    return NextResponse.next();
  }
  // Protected API routes
  const protectedPaths = ['/api/invoices', '/api/logs', '/api/pdf'];
  const isProtected = protectedPaths.some(path => 
    request.nextUrl.pathname.startsWith(path)
  );
  
  if (isProtected && !token) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  if (token) {
    try {
      // Verify JWT using jose (Edge-compatible)
      const secret = new TextEncoder().encode(JWT_SECRET);
      await jwtVerify(token, secret);
    } catch (err: any) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Middleware JWT verification error:', err.message || err);
      }
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: '/api/:path*',
};
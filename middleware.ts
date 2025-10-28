// ====================================
// middleware.ts - FIXED VERSION
// Properly protects both pages and API routes
// ====================================
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth-token')?.value;
  
  // === 1. ALLOW: Static assets and Next.js internals ===
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/pdfs/') ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js)$/)
  ) {
    return NextResponse.next();
  }
  
  // === 2. ALLOW: Public routes (anyone can access) ===
  const publicPaths = [
    '/',                      // Landing page
    '/login',                 // Login page
    '/register',              // Register page
    '/api/auth/login',        // Login API
    '/api/auth/register',     // Register API
    '/api/auth/challenge',    // WebAuthn challenge
    '/api/test-pdf',          // PDF test (optional, can remove)
  ];
  
  if (publicPaths.includes(pathname)) {
    // If user is logged in and tries to access login/register, redirect to dashboard
    if (token && (pathname === '/login' || pathname === '/register')) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }
  
  // === 3. PROTECT: All dashboard pages ===
  const protectedPagePaths = [
    '/dashboard',
    '/invoices',
    '/settings',
    '/profile',
    '/logs',
    '/diagnostics',
  ];
  
  const isProtectedPage = protectedPagePaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
  
  if (isProtectedPage) {
    if (!token) {
      console.log('🔒 Blocked page access:', pathname, '- No token');
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    // Has token, allow access
    return NextResponse.next();
  }
  
  // === 4. PROTECT: All API routes (except public ones) ===
  const protectedAPIPaths = [
    '/api/invoices',
    '/api/logs',
    '/api/pdf',
    '/api/settings',
    '/api/user',
    '/api/list-pdfs',
  ];
  
  const isProtectedAPI = protectedAPIPaths.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );
  
  if (isProtectedAPI) {
    if (!token) {
      console.log('🔒 Blocked API access:', pathname, '- No token');
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }
    // Has token, allow access
    return NextResponse.next();
  }
  
  // === 5. DEFAULT: Allow other routes ===
  return NextResponse.next();
}

// Configure matcher to run on all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
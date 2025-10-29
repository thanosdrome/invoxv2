// ====================================
// middleware.ts - FIXED VERSION
// Properly protects both pages and API routes
// ====================================
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
    '/api/auth/validate',     // Token validation endpoint used by middleware
  ];
  
  if (publicPaths.includes(pathname)) {
    // If user has a token and visits login/register, validate token and redirect to dashboard if valid
    if (token && (pathname === '/login' || pathname === '/register')) {
      try {
        const validateUrl = new URL('/api/auth/validate', request.url).toString();
        const resp = await fetch(validateUrl, { headers: { cookie: request.headers.get('cookie') || '' } });
        if (resp.ok) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        // invalid token — fall through and allow login page to render; login page will clear cookie if requested
      } catch (e) {
        // network or other error — allow login to proceed
      }
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

    // Validate token by calling internal validation endpoint (this runs server-side)
    try {
      const validateUrl = new URL('/api/auth/validate', request.url).toString();
      const resp = await fetch(validateUrl, { headers: { cookie: request.headers.get('cookie') || '' } });
      if (!resp.ok) {
        console.log('🔒 Invalid token for page access, redirecting to login:', pathname);
        const loginUrl = new URL('/login', request.url);
        loginUrl.searchParams.set('clear', '1');
        loginUrl.searchParams.set('from', pathname);

        // If the validation endpoint set a cookie (for example to clear the stale auth-token),
        // forward that Set-Cookie header into the redirect response so the browser receives it
        const setCookie = resp.headers.get('set-cookie');
        const redirectRes = NextResponse.redirect(loginUrl);
        if (setCookie) {
          // Attach the Set-Cookie header to the redirect response
          redirectRes.headers.set('set-cookie', setCookie);
        }
        return redirectRes;
      }
    } catch (err) {
      console.error('Token validation request failed:', err);
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Valid token
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

    // Validate token for API access
    try {
      const validateUrl = new URL('/api/auth/validate', request.url).toString();
      const resp = await fetch(validateUrl, { headers: { cookie: request.headers.get('cookie') || '' } });
      if (!resp.ok) {
        console.log('🔒 Invalid token for API access:', pathname);
        const res = NextResponse.json({ error: 'Authentication required' }, { status: 401 });
        // clear cookie server-side so clients don't keep sending it
        res.cookies.set('auth-token', '', {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          path: '/',
          maxAge: 0,
        });
        return res;
      }
    } catch (err) {
      console.error('Token validation request failed for API:', err);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

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
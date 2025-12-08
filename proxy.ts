import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // If user is pending, redirect to pending page (except for pending page itself)
    if (token?.status === 'pending' && !pathname.startsWith('/pending')) {
      return NextResponse.redirect(new URL('/pending', req.url));
    }

    // If user is suspended, redirect to login with error
    if (token?.status === 'suspended') {
      return NextResponse.redirect(new URL('/login?error=suspended', req.url));
    }

    // Admin routes require admin or superadmin role
    if (pathname.startsWith('/admin')) {
      const role = token?.role;

      // Superadmin routes require superadmin role
      if (pathname.startsWith('/admin/super')) {
        if (role !== 'superadmin') {
          return NextResponse.redirect(new URL('/admin', req.url));
        }
      }
      // Regular admin routes require admin or superadmin
      else if (role !== 'admin' && role !== 'superadmin') {
        return NextResponse.redirect(new URL('/', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const pathname = req.nextUrl.pathname;

        // Public paths that don't require auth
        const publicPaths = ['/login', '/signup', '/api/auth'];
        const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

        if (isPublicPath) {
          return true;
        }

        // All other paths require authentication
        return !!token;
      },
    },
  }
);

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     * - api/auth (auth endpoints)
     * - PWA files (manifest.json, sw.js, icons/)
     */
    '/((?!_next/static|_next/image|favicon.ico|public|api/auth|manifest.json|sw.js|icons/).*)',
  ],
};

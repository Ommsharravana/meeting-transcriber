import { withAuth } from 'next-auth/middleware';

export default withAuth({
  pages: {
    signIn: '/login',
  },
});

export const config = {
  // Protect all routes except auth pages and public assets
  matcher: [
    '/((?!login|signup|api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};

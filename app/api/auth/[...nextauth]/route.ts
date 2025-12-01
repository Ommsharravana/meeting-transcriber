import NextAuth from 'next-auth';
import { authOptions } from '@/lib/auth/config';

// Ensure the secret is set for NextAuth
const handler = NextAuth({
  ...authOptions,
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
});

export { handler as GET, handler as POST };

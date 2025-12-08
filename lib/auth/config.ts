import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { findUserByEmail } from './users';

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || 'development-secret-change-in-production',
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Please enter email and password');
        }

        const user = await findUserByEmail(credentials.email);

        if (!user) {
          throw new Error('No account found with this email');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);

        if (!isValid) {
          throw new Error('Invalid password');
        }

        // Check account status
        if (user.status === 'pending') {
          throw new Error('Your account is pending approval. Please wait for an administrator to approve your account.');
        }

        if (user.status === 'suspended') {
          throw new Error('Your account has been suspended. Please contact an administrator.');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          status: user.status,
        };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.status = user.status;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as 'user' | 'admin' | 'superadmin';
        session.user.status = token.status as 'pending' | 'active' | 'suspended';
      }
      return session;
    },
  },
};

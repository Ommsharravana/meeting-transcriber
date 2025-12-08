import 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    name?: string;
    role: 'user' | 'admin' | 'superadmin';
    status: 'pending' | 'active' | 'suspended';
  }

  interface Session {
    user: User & {
      id: string;
      role: 'user' | 'admin' | 'superadmin';
      status: 'pending' | 'active' | 'suspended';
    };
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'user' | 'admin' | 'superadmin';
    status: 'pending' | 'active' | 'suspended';
  }
}

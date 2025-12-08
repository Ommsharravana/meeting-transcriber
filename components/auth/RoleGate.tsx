'use client';

import { useSession } from 'next-auth/react';
import { ReactNode } from 'react';

interface RoleGateProps {
  children: ReactNode;
  roles: ('user' | 'admin' | 'superadmin')[];
  fallback?: ReactNode;
}

export function RoleGate({ children, roles, fallback = null }: RoleGateProps) {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return null;
  }

  if (!session?.user?.role) {
    return fallback;
  }

  if (!roles.includes(session.user.role)) {
    return fallback;
  }

  return <>{children}</>;
}

export function AdminGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGate roles={['admin', 'superadmin']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

export function SuperAdminGate({ children, fallback }: { children: ReactNode; fallback?: ReactNode }) {
  return (
    <RoleGate roles={['superadmin']} fallback={fallback}>
      {children}
    </RoleGate>
  );
}

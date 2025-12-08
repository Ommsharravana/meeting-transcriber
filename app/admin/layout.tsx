'use client';

import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useEffect } from 'react';
import {
  Users,
  UserCheck,
  BarChart3,
  Settings,
  Shield,
  ChevronRight,
  Home,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: Home },
  { name: 'Users', href: '/admin/users', icon: Users },
  { name: 'Approvals', href: '/admin/approvals', icon: UserCheck },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
];

const superAdminNavigation = [
  { name: 'Manage Admins', href: '/admin/super/admins', icon: Shield },
  { name: 'System Settings', href: '/admin/super/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === 'authenticated') {
      const role = session?.user?.role;
      if (role !== 'admin' && role !== 'superadmin') {
        router.push('/');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-pulse text-cyan-400">Loading...</div>
      </div>
    );
  }

  const isSuperAdmin = session?.user?.role === 'superadmin';

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-gray-800/50 backdrop-blur-xl border-r border-gray-700/50 p-4">
          <div className="mb-8">
            <Link href="/" className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 transition-colors">
              <ChevronRight className="w-4 h-4" />
              <span className="text-sm">Back to App</span>
            </Link>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Shield className="w-5 h-5 text-cyan-400" />
              Admin Panel
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              {isSuperAdmin ? 'Super Administrator' : 'Administrator'}
            </p>
          </div>

          <nav className="space-y-1">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                    isActive
                      ? 'bg-cyan-500/20 text-cyan-400'
                      : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              );
            })}

            {isSuperAdmin && (
              <>
                <div className="pt-4 pb-2">
                  <p className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Super Admin
                  </p>
                </div>
                {superAdminNavigation.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </>
            )}
          </nav>

          <div className="absolute bottom-4 left-4 right-4">
            <div className="bg-gray-900/50 rounded-lg p-3">
              <p className="text-xs text-gray-500">Logged in as</p>
              <p className="text-sm text-white truncate">{session?.user?.email}</p>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}

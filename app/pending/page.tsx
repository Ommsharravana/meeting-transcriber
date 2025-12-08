'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Clock, Mail, LogOut } from 'lucide-react';

export default function PendingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    // If user is active, redirect to home
    if (session?.user?.status === 'active') {
      router.push('/');
    }
  }, [session, router]);

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="animate-pulse text-cyan-400">Loading...</div>
      </div>
    );
  }

  if (!session) {
    router.push('/login');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-4">
      <div className="max-w-md w-full">
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Clock className="w-8 h-8 text-yellow-400" />
          </div>

          <h1 className="text-2xl font-bold text-white mb-2">
            Account Pending Approval
          </h1>

          <p className="text-gray-400 mb-6">
            Your account has been created but is awaiting approval from an administrator.
            You&apos;ll be able to access the application once your account is approved.
          </p>

          <div className="bg-gray-900/50 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 text-left">
              <Mail className="w-5 h-5 text-cyan-400 flex-shrink-0" />
              <div>
                <p className="text-sm text-gray-500">Registered as</p>
                <p className="text-white">{session.user?.email}</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full py-3 px-4 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 rounded-xl font-medium transition-colors"
            >
              Check Status
            </button>

            <button
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="w-full py-3 px-4 bg-gray-700/50 hover:bg-gray-700 text-gray-300 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-6">
            If you believe this is an error, please contact your administrator.
          </p>
        </div>
      </div>
    </div>
  );
}

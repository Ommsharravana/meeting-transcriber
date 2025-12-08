'use client';

import { useEffect, useState } from 'react';
import { Users, UserCheck, Clock, BarChart3 } from 'lucide-react';
import Link from 'next/link';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  totalTranscriptions: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/analytics');
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      name: 'Total Users',
      value: stats?.totalUsers ?? 0,
      icon: Users,
      color: 'cyan',
      href: '/admin/users',
    },
    {
      name: 'Active Users',
      value: stats?.activeUsers ?? 0,
      icon: UserCheck,
      color: 'green',
      href: '/admin/users?status=active',
    },
    {
      name: 'Pending Approval',
      value: stats?.pendingUsers ?? 0,
      icon: Clock,
      color: 'yellow',
      href: '/admin/approvals',
    },
    {
      name: 'Total Transcriptions',
      value: stats?.totalTranscriptions ?? 0,
      icon: BarChart3,
      color: 'purple',
      href: '/admin/analytics',
    },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-white mb-8">Admin Dashboard</h1>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/50 rounded-xl p-6 animate-pulse"
            >
              <div className="h-4 bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Link
              key={stat.name}
              href={stat.href}
              className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 hover:border-gray-600/50 transition-colors group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-400 text-sm">{stat.name}</span>
                <stat.icon
                  className={`w-5 h-5 ${
                    stat.color === 'cyan'
                      ? 'text-cyan-400'
                      : stat.color === 'green'
                      ? 'text-green-400'
                      : stat.color === 'yellow'
                      ? 'text-yellow-400'
                      : 'text-purple-400'
                  }`}
                />
              </div>
              <p className="text-3xl font-bold text-white group-hover:text-cyan-400 transition-colors">
                {stat.value.toLocaleString()}
              </p>
            </Link>
          ))}
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">Quick Actions</h2>
          <div className="space-y-2">
            <Link
              href="/admin/approvals"
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-700/50 transition-colors group"
            >
              <span className="text-gray-300 group-hover:text-white">
                Review pending approvals
              </span>
              <span className="text-yellow-400 font-medium">
                {stats?.pendingUsers ?? 0} pending
              </span>
            </Link>
            <Link
              href="/admin/users"
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-700/50 transition-colors group"
            >
              <span className="text-gray-300 group-hover:text-white">
                Manage users
              </span>
              <span className="text-cyan-400">&rarr;</span>
            </Link>
            <Link
              href="/admin/analytics"
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg hover:bg-gray-700/50 transition-colors group"
            >
              <span className="text-gray-300 group-hover:text-white">
                View analytics
              </span>
              <span className="text-cyan-400">&rarr;</span>
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4">System Info</h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Database</span>
              <span className="text-green-400">Supabase Connected</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Authentication</span>
              <span className="text-green-400">NextAuth Active</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">API Key Encryption</span>
              <span className="text-green-400">AES-256-GCM</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

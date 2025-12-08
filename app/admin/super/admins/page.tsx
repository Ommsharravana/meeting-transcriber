'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  ShieldCheck,
  UserPlus,
  UserMinus,
  Search,
  User,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin' | 'superadmin';
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
}

export default function ManageAdminsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [admins, setAdmins] = useState<UserData[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.role !== 'superadmin') {
      router.push('/admin');
      return;
    }
    fetchUsers();
  }, [session, router]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const [adminsRes, usersRes] = await Promise.all([
        fetch('/api/admin/users?role=admin'),
        fetch('/api/admin/users?role=user&status=active'),
      ]);

      if (adminsRes.ok) {
        const data = await adminsRes.json();
        setAdmins(data.users);
      }

      if (usersRes.ok) {
        const data = await usersRes.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handlePromote(userId: string) {
    setProcessingId(userId);
    try {
      const res = await fetch('/api/admin/super/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to promote user');
      }
    } catch (error) {
      console.error('Promote failed:', error);
      alert('Failed to promote user');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleDemote(userId: string) {
    if (!confirm('Are you sure you want to demote this admin to a regular user?')) {
      return;
    }

    setProcessingId(userId);
    try {
      const res = await fetch('/api/admin/super/demote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        fetchUsers();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to demote admin');
      }
    } catch (error) {
      console.error('Demote failed:', error);
      alert('Failed to demote admin');
    } finally {
      setProcessingId(null);
    }
  }

  const filteredUsers = users.filter((user) => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.email.toLowerCase().includes(searchLower) ||
      user.name?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Manage Administrators</h1>
        <p className="text-gray-400 mt-1">Promote users to admin or demote existing admins</p>
      </div>

      {/* Current Admins */}
      <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Current Administrators
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-700 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-48"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-700 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : admins.length === 0 ? (
          <p className="text-gray-500 py-4">No administrators found</p>
        ) : (
          <div className="space-y-2">
            {admins.map((admin) => (
              <div
                key={admin.id}
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-cyan-500/20 rounded-full flex items-center justify-center">
                    <Shield className="w-5 h-5 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{admin.name || 'No name'}</p>
                    <p className="text-sm text-gray-400">{admin.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleDemote(admin.id)}
                  disabled={processingId === admin.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <UserMinus className="w-4 h-4" />
                  Demote
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Promote Users */}
      <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-green-400" />
          Promote User to Admin
        </h2>

        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-3 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-700 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-48"></div>
                  </div>
                </div>
                <div className="h-8 bg-gray-700 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : filteredUsers.length === 0 ? (
          <p className="text-gray-500 py-4">
            {search ? 'No users match your search' : 'No active users available to promote'}
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                    <User className="w-5 h-5 text-gray-400" />
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name || 'No name'}</p>
                    <p className="text-sm text-gray-400">{user.email}</p>
                  </div>
                </div>

                <button
                  onClick={() => handlePromote(user.id)}
                  disabled={processingId === user.id}
                  className="flex items-center gap-2 px-3 py-1.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg text-sm transition-colors disabled:opacity-50"
                >
                  <UserPlus className="w-4 h-4" />
                  Promote
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

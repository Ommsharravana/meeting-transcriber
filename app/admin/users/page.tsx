'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Search,
  Filter,
  MoreVertical,
  UserPlus,
  Shield,
  ShieldCheck,
  User,
  Ban,
  Trash2,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';

interface UserData {
  id: string;
  email: string;
  name: string | null;
  role: 'user' | 'admin' | 'superadmin';
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  approved_at: string | null;
}

export default function UsersPage() {
  const searchParams = useSearchParams();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(searchParams.get('status') || 'all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchUsers();
  }, [statusFilter, roleFilter]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (search) params.append('search', search);

      const res = await fetch(`/api/admin/users?${params}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleAction(userId: string, action: string) {
    setActionMenu(null);

    try {
      let res;
      switch (action) {
        case 'approve':
          res = await fetch(`/api/admin/users/${userId}/approve`, { method: 'POST' });
          break;
        case 'suspend':
          res = await fetch(`/api/admin/users/${userId}/suspend`, { method: 'POST' });
          break;
        case 'unsuspend':
          res = await fetch(`/api/admin/users/${userId}/suspend`, { method: 'DELETE' });
          break;
        case 'delete':
          if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;
          res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
          break;
      }

      if (res?.ok) {
        fetchUsers();
      } else {
        const data = await res?.json();
        alert(data.error || 'Action failed');
      }
    } catch (error) {
      console.error('Action failed:', error);
      alert('Action failed');
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'superadmin':
        return <ShieldCheck className="w-4 h-4 text-purple-400" />;
      case 'admin':
        return <Shield className="w-4 h-4 text-cyan-400" />;
      default:
        return <User className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-green-500/20 text-green-400 text-xs">
            <CheckCircle className="w-3 h-3" />
            Active
          </span>
        );
      case 'pending':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-500/20 text-yellow-400 text-xs">
            <Clock className="w-3 h-3" />
            Pending
          </span>
        );
      case 'suspended':
        return (
          <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 text-red-400 text-xs">
            <XCircle className="w-3 h-3" />
            Suspended
          </span>
        );
    }
  };

  const filteredUsers = users.filter((user) => {
    if (search) {
      const searchLower = search.toLowerCase();
      return (
        user.email.toLowerCase().includes(searchLower) ||
        user.name?.toLowerCase().includes(searchLower)
      );
    }
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-white">User Management</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
        >
          <UserPlus className="w-4 h-4" />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                className="w-full pl-10 pr-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="suspended">Suspended</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700/50">
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Role</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Joined</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="border-b border-gray-700/30">
                  <td className="px-6 py-4">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-700 rounded w-32 mb-1"></div>
                      <div className="h-3 bg-gray-700 rounded w-48"></div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-700 rounded w-16 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-6 bg-gray-700 rounded w-20 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-4 bg-gray-700 rounded w-24 animate-pulse"></div>
                  </td>
                  <td className="px-6 py-4"></td>
                </tr>
              ))
            ) : filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-gray-500">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-gray-700/30 hover:bg-gray-700/20">
                  <td className="px-6 py-4">
                    <div>
                      <p className="text-white font-medium">{user.name || 'No name'}</p>
                      <p className="text-sm text-gray-400">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getRoleIcon(user.role)}
                      <span className="text-gray-300 capitalize">{user.role}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(user.status)}</td>
                  <td className="px-6 py-4 text-gray-400 text-sm">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="relative flex justify-end">
                      <button
                        onClick={() => setActionMenu(actionMenu === user.id ? null : user.id)}
                        className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                      >
                        <MoreVertical className="w-4 h-4 text-gray-400" />
                      </button>

                      {actionMenu === user.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-10">
                          {user.status === 'pending' && (
                            <button
                              onClick={() => handleAction(user.id, 'approve')}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-green-400 hover:bg-gray-700/50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Approve
                            </button>
                          )}
                          {user.status === 'active' && user.role !== 'superadmin' && (
                            <button
                              onClick={() => handleAction(user.id, 'suspend')}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-yellow-400 hover:bg-gray-700/50"
                            >
                              <Ban className="w-4 h-4" />
                              Suspend
                            </button>
                          )}
                          {user.status === 'suspended' && (
                            <button
                              onClick={() => handleAction(user.id, 'unsuspend')}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-green-400 hover:bg-gray-700/50"
                            >
                              <CheckCircle className="w-4 h-4" />
                              Unsuspend
                            </button>
                          )}
                          {user.role !== 'superadmin' && (
                            <button
                              onClick={() => handleAction(user.id, 'delete')}
                              className="w-full flex items-center gap-2 px-4 py-2 text-left text-red-400 hover:bg-gray-700/50"
                            >
                              <Trash2 className="w-4 h-4" />
                              Delete
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}
    </div>
  );
}

function CreateUserModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, name, password, role }),
      });

      if (res.ok) {
        onCreated();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to create user');
      }
    } catch (err) {
      setError('Failed to create user');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
        <h2 className="text-xl font-bold text-white mb-4">Create New User</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-400 mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-cyan-500 hover:bg-cyan-600 disabled:opacity-50 text-white rounded-lg transition-colors"
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

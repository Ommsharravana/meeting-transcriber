'use client';

import { useEffect, useState } from 'react';
import { Clock, CheckCircle, XCircle, Mail, Calendar } from 'lucide-react';

interface PendingUser {
  id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export default function ApprovalsPage() {
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPendingUsers();
  }, []);

  async function fetchPendingUsers() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/users?status=pending');
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error('Failed to fetch pending users:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(userId: string) {
    setProcessingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}/approve`, {
        method: 'POST',
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to approve user');
      }
    } catch (error) {
      console.error('Approve failed:', error);
      alert('Failed to approve user');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleReject(userId: string) {
    if (!confirm('Are you sure you want to reject this user? Their account will be deleted.')) {
      return;
    }

    setProcessingId(userId);
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to reject user');
      }
    } catch (error) {
      console.error('Reject failed:', error);
      alert('Failed to reject user');
    } finally {
      setProcessingId(null);
    }
  }

  async function handleApproveAll() {
    if (!confirm(`Approve all ${users.length} pending users?`)) {
      return;
    }

    for (const user of users) {
      await handleApprove(user.id);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Pending Approvals</h1>
          <p className="text-gray-400 mt-1">Review and approve new user registrations</p>
        </div>

        {users.length > 0 && (
          <button
            onClick={handleApproveAll}
            disabled={processingId !== null}
            className="px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
          >
            Approve All ({users.length})
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6 animate-pulse"
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 bg-gray-700 rounded w-48"></div>
                  <div className="h-4 bg-gray-700 rounded w-64"></div>
                </div>
                <div className="flex gap-2">
                  <div className="h-10 w-24 bg-gray-700 rounded-lg"></div>
                  <div className="h-10 w-24 bg-gray-700 rounded-lg"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : users.length === 0 ? (
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-12 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-2">All Caught Up!</h2>
          <p className="text-gray-400">No pending user approvals at this time.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {users.map((user) => (
            <div
              key={user.id}
              className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-white">
                      {user.name || 'No name provided'}
                    </h3>
                    <div className="flex items-center gap-4 mt-1 text-sm">
                      <span className="flex items-center gap-1 text-gray-400">
                        <Mail className="w-4 h-4" />
                        {user.email}
                      </span>
                      <span className="flex items-center gap-1 text-gray-500">
                        <Calendar className="w-4 h-4" />
                        Registered {new Date(user.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleReject(user.id)}
                    disabled={processingId === user.id}
                    className="flex items-center gap-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={processingId === user.id}
                    className="flex items-center gap-2 px-4 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <CheckCircle className="w-4 h-4" />
                    Approve
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

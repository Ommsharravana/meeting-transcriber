'use client';

import { useEffect, useState } from 'react';
import {
  BarChart3,
  Users,
  Clock,
  Mic,
  TrendingUp,
  Calendar,
} from 'lucide-react';

interface AnalyticsData {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  totalTranscriptions: number;
  totalAudioMinutes: number;
  usageByDay: { date: string; count: number }[];
  usageByAction: { action: string; count: number }[];
  usageByProvider: { provider: string; count: number }[];
  topUsers: {
    id: string;
    email: string;
    name: string | null;
    actionCount: number;
    audioMinutes: number;
  }[];
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('30');

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  async function fetchAnalytics() {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/analytics?period=${period}`);
      if (res.ok) {
        const analyticsData = await res.json();
        setData(analyticsData);
      }
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  const statCards = [
    {
      name: 'Total Users',
      value: data?.totalUsers ?? 0,
      icon: Users,
      color: 'cyan',
    },
    {
      name: 'Active Users',
      value: data?.activeUsers ?? 0,
      icon: Users,
      color: 'green',
    },
    {
      name: 'Total Transcriptions',
      value: data?.totalTranscriptions ?? 0,
      icon: Mic,
      color: 'purple',
    },
    {
      name: 'Audio Minutes',
      value: data?.totalAudioMinutes ?? 0,
      icon: Clock,
      color: 'yellow',
    },
  ];

  const getMaxCount = (items: { count: number }[]) => {
    return Math.max(...items.map((i) => i.count), 1);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white">Analytics</h1>
          <p className="text-gray-400 mt-1">Usage statistics and insights</p>
        </div>

        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-400" />
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
            <option value="365">Last year</option>
          </select>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {statCards.map((stat) => (
            <div
              key={stat.name}
              className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6"
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
              <p className="text-3xl font-bold text-white">
                {stat.value.toLocaleString()}
              </p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Usage by Day Chart */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            Usage Over Time
          </h2>

          {loading ? (
            <div className="h-48 flex items-center justify-center">
              <div className="animate-pulse text-gray-500">Loading...</div>
            </div>
          ) : data?.usageByDay && data.usageByDay.length > 0 ? (
            <div className="h-48 flex items-end gap-1">
              {data.usageByDay.slice(-14).map((day, i) => {
                const maxCount = getMaxCount(data.usageByDay);
                const height = (day.count / maxCount) * 100;
                return (
                  <div
                    key={i}
                    className="flex-1 flex flex-col items-center gap-1"
                  >
                    <div
                      className="w-full bg-cyan-500/50 rounded-t hover:bg-cyan-500/70 transition-colors"
                      style={{ height: `${Math.max(height, 4)}%` }}
                      title={`${day.date}: ${day.count} actions`}
                    ></div>
                    <span className="text-[10px] text-gray-500 -rotate-45 origin-top-left">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              No usage data available
            </div>
          )}
        </div>

        {/* Usage by Action */}
        <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-purple-400" />
            Usage by Action
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex justify-between mb-1">
                    <div className="h-4 bg-gray-700 rounded w-24"></div>
                    <div className="h-4 bg-gray-700 rounded w-12"></div>
                  </div>
                  <div className="h-2 bg-gray-700 rounded"></div>
                </div>
              ))}
            </div>
          ) : data?.usageByAction && data.usageByAction.length > 0 ? (
            <div className="space-y-3">
              {data.usageByAction.map((item) => {
                const maxCount = getMaxCount(data.usageByAction);
                const width = (item.count / maxCount) * 100;
                return (
                  <div key={item.action}>
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-300 capitalize">
                        {item.action.replace('_', ' ')}
                      </span>
                      <span className="text-gray-400">{item.count}</span>
                    </div>
                    <div className="h-2 bg-gray-700 rounded overflow-hidden">
                      <div
                        className="h-full bg-purple-500/70 rounded"
                        style={{ width: `${width}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-gray-500">
              No action data available
            </div>
          )}
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-gray-800/50 backdrop-blur-xl border border-gray-700/50 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
          <Users className="w-5 h-5 text-green-400" />
          Top Users
        </h2>

        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between py-2 animate-pulse">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-700 rounded-full"></div>
                  <div>
                    <div className="h-4 bg-gray-700 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-700 rounded w-48"></div>
                  </div>
                </div>
                <div className="h-4 bg-gray-700 rounded w-24"></div>
              </div>
            ))}
          </div>
        ) : data?.topUsers && data.topUsers.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-400 border-b border-gray-700/50">
                  <th className="pb-3 font-medium">User</th>
                  <th className="pb-3 font-medium text-right">Actions</th>
                  <th className="pb-3 font-medium text-right">Audio Minutes</th>
                </tr>
              </thead>
              <tbody>
                {data.topUsers.map((user, i) => (
                  <tr key={user.id} className="border-b border-gray-700/30">
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium text-gray-300">
                          {i + 1}
                        </div>
                        <div>
                          <p className="text-white">{user.name || 'No name'}</p>
                          <p className="text-sm text-gray-400">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-right text-gray-300">
                      {user.actionCount.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-gray-300">
                      {user.audioMinutes.toLocaleString()} min
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center text-gray-500">No user data available</div>
        )}
      </div>
    </div>
  );
}

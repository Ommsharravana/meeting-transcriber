import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/config';
import { countUsersByStatus } from '@/lib/auth/users';
import { getSystemUsageStats, getTopUsersByUsage } from '@/lib/usage';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    if (session.user.role !== 'admin' && session.user.role !== 'superadmin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // days

    // Get user counts
    const userCounts = await countUsersByStatus();

    // Get usage statistics
    const usageStats = await getSystemUsageStats(parseInt(period));

    // Get top users
    const topUsers = await getTopUsersByUsage(parseInt(period), 10);

    return NextResponse.json({
      totalUsers: userCounts.total,
      activeUsers: userCounts.active,
      pendingUsers: userCounts.pending,
      suspendedUsers: userCounts.suspended,
      totalTranscriptions: usageStats?.totalTranscriptions ?? 0,
      totalAudioMinutes: Math.round(usageStats?.totalAudioMinutes ?? 0),
      usageByDay: usageStats?.byDay ?? {},
      usageByAction: usageStats?.byAction ?? {},
      usageByProvider: usageStats?.byProvider ?? {},
      topUsers: topUsers.map(u => ({
        id: u.userId,
        actionCount: u.count
      }))
    });
  } catch (error: any) {
    console.error('Analytics API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

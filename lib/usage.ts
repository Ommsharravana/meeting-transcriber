import { createServerClient } from './supabase/server';

export interface UsageLogEntry {
  userId: string;
  action: 'transcribe' | 'summarize' | 'extract_actions' | 'generate_wiki';
  provider?: 'openai' | 'elevenlabs';
  audioDurationSeconds?: number;
  model?: string;
}

/**
 * Log a usage event for analytics
 */
export async function logUsage(entry: UsageLogEntry): Promise<void> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('usage_logs')
    .insert({
      user_id: entry.userId,
      action: entry.action,
      provider: entry.provider || null,
      audio_duration_seconds: entry.audioDurationSeconds || null,
      model: entry.model || null,
    });

  if (error) {
    console.error('Failed to log usage:', error);
    // Don't throw - usage logging should not break the main flow
  }
}

/**
 * Get usage statistics for a user
 */
export async function getUserUsageStats(userId: string, days: number = 30) {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Failed to get usage stats:', error);
    return null;
  }

  // Aggregate stats
  const stats = {
    totalTranscriptions: 0,
    totalAudioMinutes: 0,
    byAction: {} as Record<string, number>,
    byProvider: {} as Record<string, number>,
    byModel: {} as Record<string, number>,
    recentUsage: data.slice(0, 10),
  };

  for (const log of data) {
    if (log.action === 'transcribe') {
      stats.totalTranscriptions++;
    }
    if (log.audio_duration_seconds) {
      stats.totalAudioMinutes += log.audio_duration_seconds / 60;
    }

    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

    // Count by provider
    if (log.provider) {
      stats.byProvider[log.provider] = (stats.byProvider[log.provider] || 0) + 1;
    }

    // Count by model
    if (log.model) {
      stats.byModel[log.model] = (stats.byModel[log.model] || 0) + 1;
    }
  }

  stats.totalAudioMinutes = Math.round(stats.totalAudioMinutes * 100) / 100;

  return stats;
}

/**
 * Get system-wide usage statistics (for admin)
 */
export async function getSystemUsageStats(days: number = 30) {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('usage_logs')
    .select('*')
    .gte('created_at', since.toISOString());

  if (error) {
    console.error('Failed to get system usage stats:', error);
    return null;
  }

  const stats = {
    totalRequests: data.length,
    totalTranscriptions: 0,
    totalAudioMinutes: 0,
    uniqueUsers: new Set<string>(),
    byAction: {} as Record<string, number>,
    byProvider: {} as Record<string, number>,
    byDay: {} as Record<string, number>,
  };

  for (const log of data) {
    stats.uniqueUsers.add(log.user_id);

    if (log.action === 'transcribe') {
      stats.totalTranscriptions++;
    }
    if (log.audio_duration_seconds) {
      stats.totalAudioMinutes += log.audio_duration_seconds / 60;
    }

    // Count by action
    stats.byAction[log.action] = (stats.byAction[log.action] || 0) + 1;

    // Count by provider
    if (log.provider) {
      stats.byProvider[log.provider] = (stats.byProvider[log.provider] || 0) + 1;
    }

    // Count by day
    const day = new Date(log.created_at).toISOString().split('T')[0];
    stats.byDay[day] = (stats.byDay[day] || 0) + 1;
  }

  return {
    ...stats,
    uniqueUsers: stats.uniqueUsers.size,
    totalAudioMinutes: Math.round(stats.totalAudioMinutes * 100) / 100,
  };
}

/**
 * Get top users by usage (for admin)
 */
export async function getTopUsersByUsage(days: number = 30, limit: number = 10) {
  const supabase = createServerClient();
  const since = new Date();
  since.setDate(since.getDate() - days);

  const { data, error } = await supabase
    .from('usage_logs')
    .select('user_id')
    .gte('created_at', since.toISOString());

  if (error) {
    console.error('Failed to get top users:', error);
    return [];
  }

  // Count usage per user
  const userCounts: Record<string, number> = {};
  for (const log of data) {
    userCounts[log.user_id] = (userCounts[log.user_id] || 0) + 1;
  }

  // Sort and limit
  const sorted = Object.entries(userCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, limit);

  return sorted.map(([userId, count]) => ({ userId, count }));
}

import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client with service role key
// Use this for admin operations that bypass RLS
export function createServerClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createSupabaseClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Database types for TypeScript
export interface DbUser {
  id: string;
  email: string;
  name: string | null;
  password_hash: string;
  role: 'user' | 'admin' | 'superadmin';
  status: 'pending' | 'active' | 'suspended';
  created_at: string;
  updated_at: string;
  approved_by: string | null;
  approved_at: string | null;
}

export interface DbApiKey {
  id: string;
  user_id: string;
  provider: 'openai' | 'elevenlabs';
  encrypted_key: string;
  key_hint: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbUsageLog {
  id: string;
  user_id: string;
  action: string;
  provider: string | null;
  audio_duration_seconds: number | null;
  model: string | null;
  created_at: string;
}

export interface DbSystemSetting {
  key: string;
  value: Record<string, unknown>;
  updated_by: string | null;
  updated_at: string;
}

export interface DbAuditLog {
  id: string;
  actor_id: string | null;
  action: string;
  target_type: string | null;
  target_id: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
}

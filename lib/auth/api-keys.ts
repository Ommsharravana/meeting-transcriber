import { createServerClient, DbApiKey } from '../supabase/server';
import { encryptApiKey, decryptApiKey, getKeyHint, maskApiKey } from '../encryption';

export interface ApiKeyInfo {
  id: string;
  provider: 'openai' | 'elevenlabs';
  hint: string;
  maskedKey?: string;
  createdAt: string;
  updatedAt: string;
}

/**
 * Get a user's decrypted API key for a specific provider
 * Used internally by API routes to make requests
 */
export async function getUserApiKey(
  userId: string,
  provider: 'openai' | 'elevenlabs'
): Promise<string | null> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('encrypted_key')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  if (error || !data) {
    return null;
  }

  try {
    return decryptApiKey(data.encrypted_key);
  } catch (err) {
    console.error('Failed to decrypt API key:', err);
    return null;
  }
}

/**
 * Get all API key info for a user (masked, safe to return to client)
 */
export async function getUserApiKeys(userId: string): Promise<ApiKeyInfo[]> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('*')
    .eq('user_id', userId)
    .order('provider');

  if (error) {
    console.error('Error fetching API keys:', error);
    return [];
  }

  return (data as DbApiKey[]).map((key) => ({
    id: key.id,
    provider: key.provider,
    hint: key.key_hint || '****',
    createdAt: key.created_at,
    updatedAt: key.updated_at,
  }));
}

/**
 * Check if a user has an API key for a specific provider
 */
export async function hasApiKey(
  userId: string,
  provider: 'openai' | 'elevenlabs'
): Promise<boolean> {
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('api_keys')
    .select('id')
    .eq('user_id', userId)
    .eq('provider', provider)
    .single();

  return !error && !!data;
}

/**
 * Save or update a user's API key for a provider
 */
export async function saveUserApiKey(
  userId: string,
  provider: 'openai' | 'elevenlabs',
  plainKey: string
): Promise<boolean> {
  const supabase = createServerClient();

  const encryptedKey = encryptApiKey(plainKey);
  const hint = getKeyHint(plainKey);

  // Upsert - insert or update if exists
  const { error } = await supabase
    .from('api_keys')
    .upsert(
      {
        user_id: userId,
        provider,
        encrypted_key: encryptedKey,
        key_hint: hint,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,provider',
      }
    );

  if (error) {
    console.error('Error saving API key:', error);
    return false;
  }

  return true;
}

/**
 * Delete a user's API key for a provider
 */
export async function deleteUserApiKey(
  userId: string,
  provider: 'openai' | 'elevenlabs'
): Promise<boolean> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('user_id', userId)
    .eq('provider', provider);

  if (error) {
    console.error('Error deleting API key:', error);
    return false;
  }

  return true;
}

/**
 * Delete all API keys for a user
 */
export async function deleteAllUserApiKeys(userId: string): Promise<boolean> {
  const supabase = createServerClient();

  const { error } = await supabase
    .from('api_keys')
    .delete()
    .eq('user_id', userId);

  if (error) {
    console.error('Error deleting all API keys:', error);
    return false;
  }

  return true;
}

/**
 * Validate an API key format (basic validation, not verification with provider)
 */
export function validateApiKeyFormat(
  provider: 'openai' | 'elevenlabs',
  key: string
): { valid: boolean; error?: string } {
  if (!key || key.trim().length === 0) {
    return { valid: false, error: 'API key is required' };
  }

  if (provider === 'openai') {
    // OpenAI keys typically start with 'sk-' and are fairly long
    if (!key.startsWith('sk-')) {
      return { valid: false, error: 'OpenAI API key should start with "sk-"' };
    }
    if (key.length < 20) {
      return { valid: false, error: 'OpenAI API key appears too short' };
    }
  } else if (provider === 'elevenlabs') {
    // ElevenLabs keys are typically 32 characters
    if (key.length < 20) {
      return { valid: false, error: 'ElevenLabs API key appears too short' };
    }
  }

  return { valid: true };
}

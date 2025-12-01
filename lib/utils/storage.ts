import { TranscriptionProvider } from '@/types/transcription';

const API_KEY_STORAGE_KEY = 'openai_api_key';
const ELEVENLABS_API_KEY_STORAGE_KEY = 'elevenlabs_api_key';
const SPEAKER_NAMES_KEY = 'speaker_names';

// Multi-provider API key storage
const PROVIDER_STORAGE_KEYS: Record<TranscriptionProvider, string> = {
  openai: API_KEY_STORAGE_KEY,
  elevenlabs: ELEVENLABS_API_KEY_STORAGE_KEY,
};

export function getStoredApiKey(provider: TranscriptionProvider = 'openai'): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(PROVIDER_STORAGE_KEYS[provider]);
}

export function setStoredApiKey(key: string, provider: TranscriptionProvider = 'openai'): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROVIDER_STORAGE_KEYS[provider], key);
}

export function clearStoredApiKey(provider: TranscriptionProvider = 'openai'): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(PROVIDER_STORAGE_KEYS[provider]);
}

// Get all stored API keys
export function getAllStoredApiKeys(): Record<TranscriptionProvider, string | null> {
  return {
    openai: getStoredApiKey('openai'),
    elevenlabs: getStoredApiKey('elevenlabs'),
  };
}

export function getStoredSpeakerNames(): Record<string, string> {
  if (typeof window === 'undefined') return {};
  const stored = localStorage.getItem(SPEAKER_NAMES_KEY);
  if (!stored) return {};
  try {
    return JSON.parse(stored);
  } catch {
    return {};
  }
}

export function setStoredSpeakerNames(names: Record<string, string>): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(SPEAKER_NAMES_KEY, JSON.stringify(names));
}

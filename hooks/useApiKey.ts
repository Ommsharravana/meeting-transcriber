'use client';

import { useEffect } from 'react';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { getStoredApiKey, setStoredApiKey, clearStoredApiKey, getAllStoredApiKeys } from '@/lib/utils/storage';
import { TranscriptionProvider } from '@/types/transcription';

// Hook for a specific provider's API key
export function useProviderApiKey(provider: TranscriptionProvider) {
  const { apiKeys, setApiKey } = useTranscriptionStore();
  const key = apiKeys[provider];

  // Load API key from localStorage on mount
  useEffect(() => {
    const stored = getStoredApiKey(provider);
    if (stored && !key) {
      setApiKey(provider, stored);
    }
  }, [provider, setApiKey, key]);

  const saveApiKey = (newKey: string) => {
    setApiKey(provider, newKey);
    setStoredApiKey(newKey, provider);
  };

  const removeApiKey = () => {
    setApiKey(provider, null);
    clearStoredApiKey(provider);
  };

  const validateKey = (keyToValidate: string): boolean => {
    if (provider === 'openai') {
      return keyToValidate.startsWith('sk-') && keyToValidate.length > 20;
    }
    if (provider === 'elevenlabs') {
      // ElevenLabs keys are typically 32 hex characters
      return keyToValidate.length >= 20;
    }
    return false;
  };

  const isValid = key ? validateKey(key) : false;

  return {
    apiKey: key,
    isValid,
    saveApiKey,
    removeApiKey,
  };
}

// Legacy hook for backward compatibility (defaults to OpenAI)
export function useApiKey() {
  const { apiKeys, setApiKey } = useTranscriptionStore();
  const apiKey = apiKeys.openai;

  // Load all API keys from localStorage on mount
  useEffect(() => {
    const storedKeys = getAllStoredApiKeys();
    if (storedKeys.openai && !apiKeys.openai) {
      setApiKey('openai', storedKeys.openai);
    }
    if (storedKeys.elevenlabs && !apiKeys.elevenlabs) {
      setApiKey('elevenlabs', storedKeys.elevenlabs);
    }
  }, [setApiKey, apiKeys.openai, apiKeys.elevenlabs]);

  const saveApiKey = (key: string) => {
    setApiKey('openai', key);
    setStoredApiKey(key, 'openai');
  };

  const removeApiKey = () => {
    setApiKey('openai', null);
    clearStoredApiKey('openai');
  };

  const isValid = apiKey && apiKey.startsWith('sk-') && apiKey.length > 20;

  return {
    apiKey,
    isValid,
    saveApiKey,
    removeApiKey,
    // Also expose all keys for convenience
    apiKeys,
  };
}

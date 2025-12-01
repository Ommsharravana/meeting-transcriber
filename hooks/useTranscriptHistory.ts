'use client';

import { useState, useEffect, useCallback } from 'react';
import { Transcript } from '@/types/transcription';
import {
  saveTranscript,
  getAllTranscripts,
  getTranscript,
  deleteTranscript,
  clearAllTranscripts,
  getTranscriptCount,
} from '@/lib/storage/indexedDB';

interface UseTranscriptHistoryReturn {
  history: Transcript[];
  isLoading: boolean;
  error: string | null;
  save: (transcript: Transcript) => Promise<void>;
  load: (id: string) => Promise<Transcript | null>;
  remove: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
  refresh: () => Promise<void>;
  count: number;
}

export function useTranscriptHistory(): UseTranscriptHistoryReturn {
  const [history, setHistory] = useState<Transcript[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(0);

  // Load history on mount
  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const transcripts = await getAllTranscripts();
      setHistory(transcripts);
      setCount(transcripts.length);
    } catch (err) {
      console.error('Failed to load transcript history:', err);
      setError('Failed to load history');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Save a transcript
  const save = useCallback(async (transcript: Transcript) => {
    try {
      await saveTranscript(transcript);
      await refresh();
    } catch (err) {
      console.error('Failed to save transcript:', err);
      throw err;
    }
  }, [refresh]);

  // Load a specific transcript
  const load = useCallback(async (id: string): Promise<Transcript | null> => {
    try {
      return await getTranscript(id);
    } catch (err) {
      console.error('Failed to load transcript:', err);
      return null;
    }
  }, []);

  // Delete a transcript
  const remove = useCallback(async (id: string) => {
    try {
      await deleteTranscript(id);
      await refresh();
    } catch (err) {
      console.error('Failed to delete transcript:', err);
      throw err;
    }
  }, [refresh]);

  // Clear all transcripts
  const clearAll = useCallback(async () => {
    try {
      await clearAllTranscripts();
      await refresh();
    } catch (err) {
      console.error('Failed to clear transcripts:', err);
      throw err;
    }
  }, [refresh]);

  return {
    history,
    isLoading,
    error,
    save,
    load,
    remove,
    clearAll,
    refresh,
    count,
  };
}

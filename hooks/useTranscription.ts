'use client';

import { useCallback } from 'react';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { transcribeWithChunking, ChunkProgress } from '@/lib/audio/chunker';
import { getProviderFromModel } from '@/types/transcription';
import { toast } from 'sonner';

export function useTranscription() {
  const {
    apiKeys,
    file,
    options,
    setStatus,
    setProgress,
    setChunkProgress,
    setError,
    setTranscript,
    clearFile,
  } = useTranscriptionStore();

  const startTranscription = useCallback(async () => {
    if (!file) {
      toast.error('No file selected');
      return;
    }

    // Get the correct API key based on the selected model's provider
    const provider = getProviderFromModel(options.model);
    const apiKey = apiKeys[provider];

    if (!apiKey) {
      const providerName = provider === 'openai' ? 'OpenAI' : 'ElevenLabs';
      toast.error(`Please add your ${providerName} API key in settings`);
      return;
    }

    try {
      setError(null);
      setStatus('uploading');
      setProgress(0);
      setChunkProgress(null);

      setStatus('transcribing');

      // Use the chunking-aware transcription function
      const transcript = await transcribeWithChunking(
        file,
        apiKey,
        options,
        (chunkInfo: ChunkProgress) => {
          setProgress(chunkInfo.overallProgress);
          setChunkProgress({
            currentChunk: chunkInfo.currentChunk || 0,
            totalChunks: chunkInfo.totalChunks || 1,
            phase: chunkInfo.phase,
            message: chunkInfo.message,
          });
        }
      );

      setStatus('complete');
      setProgress(100);
      setChunkProgress(null);
      setTranscript(transcript);
      clearFile();

      toast.success('Transcription complete!');
    } catch (error: any) {
      console.error('Transcription error:', error);
      // Properly log error - Error objects don't serialize with JSON.stringify
      if (error instanceof Error) {
        console.error('Error name:', error.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      } else if (error && typeof error === 'object') {
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
      } else {
        console.error('Error details:', JSON.stringify(error, null, 2));
      }
      setStatus('error');
      setChunkProgress(null);

      // Ensure we have a proper error object
      const transcriptionError = {
        code: error?.code || 'UNKNOWN_ERROR',
        message: error?.message || (typeof error === 'string' ? error : 'An error occurred during transcription'),
        details: error?.details || (error instanceof Error ? error.stack : JSON.stringify(error)),
      };

      setError(transcriptionError);
      toast.error(transcriptionError.message);
    }
  }, [file, apiKeys, options, setStatus, setProgress, setChunkProgress, setError, setTranscript, clearFile]);

  return {
    startTranscription,
  };
}

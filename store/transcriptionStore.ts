'use client';

import { create } from 'zustand';
import {
  Transcript,
  TranscriptionModel,
  ProcessingStatus,
  ChunkProgress,
  TranscriptionError,
  TranscriptionOptions,
  TranscriptionProvider,
} from '@/types/transcription';
import { DEFAULT_MODEL } from '@/lib/openai/models';

// Type for multi-provider API keys
interface ApiKeys {
  openai: string | null;
  elevenlabs: string | null;
}

interface TranscriptionState {
  // API Keys (multi-provider)
  apiKeys: ApiKeys;
  setApiKey: (provider: TranscriptionProvider, key: string | null) => void;
  getApiKey: (provider: TranscriptionProvider) => string | null;

  // Legacy single key getter for backward compatibility
  apiKey: string | null;

  // File
  file: File | null;
  setFile: (file: File | null) => void;

  // Recording
  isRecording: boolean;
  recordingBlob: Blob | null;
  recordingDuration: number;
  setIsRecording: (isRecording: boolean) => void;
  setRecordingBlob: (blob: Blob | null) => void;
  setRecordingDuration: (duration: number) => void;

  // Options
  options: TranscriptionOptions;
  setOptions: (options: Partial<TranscriptionOptions>) => void;

  // Processing
  status: ProcessingStatus;
  setStatus: (status: ProcessingStatus) => void;
  progress: number;
  setProgress: (progress: number) => void;
  chunkProgress: ChunkProgress | null;
  setChunkProgress: (progress: ChunkProgress | null) => void;

  // Results
  transcript: Transcript | null;
  setTranscript: (transcript: Transcript | null) => void;
  error: TranscriptionError | null;
  setError: (error: TranscriptionError | null) => void;

  // Speaker customization
  updateSpeakerName: (speakerId: string, name: string) => void;

  // Search/Filter
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  speakerFilter: string | null;
  setSpeakerFilter: (speakerId: string | null) => void;
  hiddenSpeakers: Set<string>;
  toggleSpeakerVisibility: (speakerId: string) => void;
  showAllSpeakers: () => void;

  // Speaker rename alias
  renameSpeaker: (speakerId: string, name: string) => void;

  // Clear file
  clearFile: () => void;

  // Reset
  reset: () => void;
}

const defaultOptions: TranscriptionOptions = {
  model: DEFAULT_MODEL,
  responseFormat: 'diarized_json',
  language: undefined,
  prompt: undefined,
  temperature: 0,
  chunkingStrategy: 'auto',
};

export const useTranscriptionStore = create<TranscriptionState>((set, get) => ({
  // API Keys (multi-provider)
  apiKeys: {
    openai: null,
    elevenlabs: null,
  },
  setApiKey: (provider, key) =>
    set((state) => ({
      apiKeys: { ...state.apiKeys, [provider]: key },
      // Sync legacy apiKey field when setting OpenAI key
      ...(provider === 'openai' ? { apiKey: key } : {}),
    })),
  getApiKey: (provider) => get().apiKeys[provider],

  // Legacy single key for backward compatibility (returns OpenAI key)
  apiKey: null,

  // File
  file: null,
  setFile: (file) => set({ file }),

  // Recording
  isRecording: false,
  recordingBlob: null,
  recordingDuration: 0,
  setIsRecording: (isRecording) => set({ isRecording }),
  setRecordingBlob: (blob) => set({ recordingBlob: blob }),
  setRecordingDuration: (duration) => set({ recordingDuration: duration }),

  // Options
  options: defaultOptions,
  setOptions: (newOptions) =>
    set((state) => ({
      options: { ...state.options, ...newOptions },
    })),

  // Processing
  status: 'idle',
  setStatus: (status) => set({ status }),
  progress: 0,
  setProgress: (progress) => set({ progress }),
  chunkProgress: null,
  setChunkProgress: (progress) => set({ chunkProgress: progress }),

  // Results
  transcript: null,
  setTranscript: (transcript) => set({ transcript }),
  error: null,
  setError: (error) => set({ error }),

  // Speaker customization
  updateSpeakerName: (speakerId, name) =>
    set((state) => {
      if (!state.transcript) return state;
      return {
        transcript: {
          ...state.transcript,
          speakerNames: {
            ...state.transcript.speakerNames,
            [speakerId]: name,
          },
        },
      };
    }),

  // Search/Filter
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),
  speakerFilter: null,
  setSpeakerFilter: (speakerId) => set({ speakerFilter: speakerId }),
  hiddenSpeakers: new Set(),
  toggleSpeakerVisibility: (speakerId) =>
    set((state) => {
      const newHidden = new Set(state.hiddenSpeakers);
      if (newHidden.has(speakerId)) {
        newHidden.delete(speakerId);
      } else {
        newHidden.add(speakerId);
      }
      return { hiddenSpeakers: newHidden };
    }),
  showAllSpeakers: () => set({ hiddenSpeakers: new Set() }),

  // Speaker rename alias (same as updateSpeakerName)
  renameSpeaker: (speakerId, name) =>
    set((state) => {
      if (!state.transcript) return state;
      return {
        transcript: {
          ...state.transcript,
          speakerNames: {
            ...state.transcript.speakerNames,
            [speakerId]: name,
          },
        },
      };
    }),

  // Clear file
  clearFile: () => set({ file: null }),

  // Reset
  reset: () =>
    set({
      file: null,
      recordingBlob: null,
      recordingDuration: 0,
      status: 'idle',
      progress: 0,
      chunkProgress: null,
      transcript: null,
      error: null,
      searchQuery: '',
      speakerFilter: null,
      hiddenSpeakers: new Set(),
    }),
}));

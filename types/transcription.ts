// Transcription Models (multi-provider)
export type TranscriptionModel =
  | 'gpt-4o-transcribe'
  | 'gpt-4o-mini-transcribe'
  | 'gpt-4o-transcribe-diarize'
  | 'whisper-1'
  | 'elevenlabs-scribe-v1';

// Transcription Providers
export type TranscriptionProvider = 'openai' | 'elevenlabs';

// Helper to get provider from model
export function getProviderFromModel(model: TranscriptionModel): TranscriptionProvider {
  if (model.startsWith('elevenlabs-')) return 'elevenlabs';
  return 'openai';
}

// Response formats by model
export type ResponseFormat = 'json' | 'text' | 'srt' | 'verbose_json' | 'vtt' | 'diarized_json';

// Model capabilities
export interface ModelCapabilities {
  id: TranscriptionModel;
  name: string;
  description: string;
  responseFormats: ResponseFormat[];
  supportsPrompt: boolean;
  supportsStreaming: boolean;
  supportsDiarization: boolean;
  supportsTimestamps: boolean;
  supportsTranslation: boolean;
  requiresChunkingStrategy: boolean;
}

// Segment with speaker identification (diarization)
export interface TranscriptSegment {
  id: string;
  speaker: string;
  speakerName?: string; // User-assigned name
  text: string;
  start: number;
  end: number;
}

// Word-level timestamp (Whisper verbose_json)
export interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

// Full transcript response
export interface Transcript {
  id: string;
  text: string;
  segments: TranscriptSegment[];
  words?: TranscriptWord[];
  duration: number;
  language?: string;
  model: TranscriptionModel;
  createdAt: Date;
  fileName: string;
  speakerColors: Record<string, number>; // speaker -> color index
  speakerNames: Record<string, string>;  // speaker -> custom name
}

// Transcription options
export interface TranscriptionOptions {
  model: TranscriptionModel;
  responseFormat: ResponseFormat;
  language?: string;
  prompt?: string;
  temperature?: number;
  chunkingStrategy?: 'auto' | null;
  dualModelMode?: boolean; // Run both gpt-4o-transcribe (quality) + gpt-4o-transcribe-diarize (speakers)
}

// Processing status
export type ProcessingStatus =
  | 'idle'
  | 'uploading'
  | 'chunking'
  | 'transcribing'
  | 'merging'
  | 'complete'
  | 'error';

// Chunk progress for large files and dual model processing
export interface ChunkProgress {
  currentChunk: number;
  totalChunks: number;
  phase: 'analyzing' | 'chunking' | 'transcribing' | 'merging' | 'complete' | 'quality' | 'diarization';
  message: string;
}

// API Error
export interface TranscriptionError {
  code: string;
  message: string;
  details?: string;
}

// OpenAI API response types
export interface OpenAITranscriptionResponse {
  text: string;
}

export interface OpenAIDiarizedResponse {
  text: string;
  segments: Array<{
    speaker: string;
    text: string;
    start: number;
    end: number;
  }>;
}

export interface OpenAIVerboseResponse {
  text: string;
  language: string;
  duration: number;
  words?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
  segments?: Array<{
    id: number;
    seek: number;
    start: number;
    end: number;
    text: string;
  }>;
}

// ElevenLabs API response types
export interface ElevenLabsWord {
  text: string;
  start: number;
  end: number;
  type: 'word' | 'spacing' | 'audio_event';
  speaker_id?: string;
}

export interface ElevenLabsResponse {
  language_code: string;
  language_probability: number;
  text: string;
  words: ElevenLabsWord[];
}

// ElevenLabs Realtime Scribe WebSocket types
export type RealtimeProvider = 'openai' | 'elevenlabs';

export interface ElevenLabsRealtimeConfig {
  model_id: 'scribe_v1' | 'scribe_v1_experimental';
  language_code?: string; // ISO 639-1 code, leave empty for auto-detect
  sample_rate?: number; // Default: 16000
  encoding?: 'pcm_s16le' | 'pcm_mulaw' | 'pcm_alaw';
  endpointing?: number; // VAD silence threshold in ms (50-500)
  max_segment_duration_secs?: number;
}

// Outgoing WebSocket messages (client -> ElevenLabs)
export interface ElevenLabsRealtimeInputAudio {
  type: 'audio';
  audio: string; // Base64 encoded PCM audio
}

export interface ElevenLabsRealtimeFlush {
  type: 'flush';
}

export interface ElevenLabsRealtimeClose {
  type: 'close';
}

export type ElevenLabsRealtimeOutgoingMessage =
  | ElevenLabsRealtimeInputAudio
  | ElevenLabsRealtimeFlush
  | ElevenLabsRealtimeClose;

// Incoming WebSocket messages (ElevenLabs -> client)
export interface ElevenLabsRealtimeTranscriptWord {
  text: string;
  start: number;
  end: number;
  type: 'word' | 'spacing';
  speaker_id?: string;
}

export interface ElevenLabsRealtimePartialTranscript {
  type: 'transcript';
  channel: 'final' | 'partial';
  start: number;
  end: number;
  transcript: string;
  words: ElevenLabsRealtimeTranscriptWord[];
}

export interface ElevenLabsRealtimeVADEvent {
  type: 'vad';
  status: 'speech_started' | 'speech_ended';
}

export interface ElevenLabsRealtimeError {
  type: 'error';
  error: string;
  message: string;
}

export interface ElevenLabsRealtimeSessionStarted {
  type: 'session_started';
  session_id: string;
}

export interface ElevenLabsRealtimeSessionEnded {
  type: 'session_ended';
}

export type ElevenLabsRealtimeIncomingMessage =
  | ElevenLabsRealtimePartialTranscript
  | ElevenLabsRealtimeVADEvent
  | ElevenLabsRealtimeError
  | ElevenLabsRealtimeSessionStarted
  | ElevenLabsRealtimeSessionEnded;

// Realtime transcription state
export interface RealtimeTranscript {
  finalText: string;
  partialText: string;
  segments: TranscriptSegment[];
  isListening: boolean;
  error?: string;
}

// Action Item (extracted from transcript)
export interface ActionItem {
  id: string;
  task: string;
  owner?: string;
  deadline?: string;
  priority?: 'high' | 'medium' | 'low';
  completed: boolean;
  sourceSegmentId?: string; // Reference to transcript segment
  createdAt: Date;
}

// Meeting Summary Wiki (structured summary)
export interface MeetingSummary {
  id: string;
  transcriptId: string;
  overview: string;
  keyPoints: string[];
  decisions: string[];
  actionItems: ActionItem[];
  nextSteps: string[];
  participants?: string[];
  topics?: string[];
  createdAt: Date;
}

import { ModelCapabilities, TranscriptionModel } from '@/types/transcription';

export const MODELS: Record<TranscriptionModel, ModelCapabilities> = {
  'gpt-4o-transcribe': {
    id: 'gpt-4o-transcribe',
    name: 'GPT-4o Transcribe',
    description: 'Highest quality transcription with GPT-4o intelligence',
    responseFormats: ['json', 'text'],
    supportsPrompt: true,
    supportsStreaming: true,
    supportsDiarization: false,
    supportsTimestamps: false,
    supportsTranslation: false,
    requiresChunkingStrategy: false,
  },
  'gpt-4o-mini-transcribe': {
    id: 'gpt-4o-mini-transcribe',
    name: 'GPT-4o Mini Transcribe',
    description: 'Fast and cost-effective transcription',
    responseFormats: ['json', 'text'],
    supportsPrompt: true,
    supportsStreaming: true,
    supportsDiarization: false,
    supportsTimestamps: false,
    supportsTranslation: false,
    requiresChunkingStrategy: false,
  },
  'gpt-4o-transcribe-diarize': {
    id: 'gpt-4o-transcribe-diarize',
    name: 'GPT-4o Diarize',
    description: 'Speaker identification for meetings and conversations',
    responseFormats: ['json', 'text', 'diarized_json'],
    supportsPrompt: false,
    supportsStreaming: true,
    supportsDiarization: true,
    supportsTimestamps: true,
    supportsTranslation: false,
    requiresChunkingStrategy: true,
  },
  'whisper-1': {
    id: 'whisper-1',
    name: 'Whisper',
    description: 'Legacy model with translation support and multiple output formats',
    responseFormats: ['json', 'text', 'srt', 'verbose_json', 'vtt'],
    supportsPrompt: true,
    supportsStreaming: false,
    supportsDiarization: false,
    supportsTimestamps: true,
    supportsTranslation: true,
    requiresChunkingStrategy: false,
  },
  'elevenlabs-scribe-v1': {
    id: 'elevenlabs-scribe-v1',
    name: 'ElevenLabs Scribe',
    description: '99 languages, speaker ID, word timestamps, audio events',
    responseFormats: ['json'],
    supportsPrompt: false,
    supportsStreaming: false,
    supportsDiarization: true,
    supportsTimestamps: true,
    supportsTranslation: false,
    requiresChunkingStrategy: false,
  },
};

export const MODEL_LIST = Object.values(MODELS);

export const DEFAULT_MODEL: TranscriptionModel = 'gpt-4o-transcribe-diarize';

// Supported audio formats
export const SUPPORTED_FORMATS = [
  'audio/mp3',
  'audio/mpeg',
  'audio/mpga',
  'audio/m4a',
  'audio/wav',
  'audio/webm',
  'audio/mp4',
  'video/mp4',
  'video/mpeg',
  'video/webm',
];

export const SUPPORTED_EXTENSIONS = ['.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm'];

export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25 MB
export const MAX_UPLOADABLE_SIZE = 500 * 1024 * 1024; // 500 MB (we'll chunk larger files)

// Language codes (subset of supported languages)
export const LANGUAGES = [
  { code: 'auto', name: 'Auto-detect' },
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ru', name: 'Russian' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'ta', name: 'Tamil' },
  { code: 'te', name: 'Telugu' },
];

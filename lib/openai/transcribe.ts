import {
  TranscriptionOptions,
  Transcript,
  TranscriptSegment,
  OpenAITranscriptionResponse,
  OpenAIDiarizedResponse,
  OpenAIVerboseResponse,
  TranscriptionError,
} from '@/types/transcription';
import { assignSpeakerColors } from '@/lib/utils/colors';

// Use our API route to proxy requests to OpenAI (avoids CORS issues)
const API_URL = '/api/transcribe';

/**
 * Transcribe an audio file using OpenAI's API
 */
export async function transcribeAudio(
  file: File | Blob,
  apiKey: string,
  options: TranscriptionOptions,
  onProgress?: (progress: number) => void
): Promise<Transcript> {
  const formData = new FormData();
  formData.append('file', file, file instanceof File ? file.name : 'recording.webm');
  formData.append('model', options.model);

  // Set response format based on model
  if (options.model === 'gpt-4o-transcribe-diarize') {
    formData.append('response_format', 'diarized_json');
    formData.append('chunking_strategy', 'auto');
  } else if (options.model === 'whisper-1' && options.responseFormat === 'verbose_json') {
    formData.append('response_format', 'verbose_json');
  } else {
    formData.append('response_format', 'json');
  }

  // Add optional parameters
  if (options.language && options.language !== 'auto') {
    formData.append('language', options.language);
  }

  if (options.prompt && options.model !== 'gpt-4o-transcribe-diarize') {
    formData.append('prompt', options.prompt);
  }

  // Add temperature if specified (only for whisper-1 model)
  if (options.temperature !== undefined && options.model === 'whisper-1') {
    formData.append('temperature', options.temperature.toString());
  }

  try {
    onProgress?.(10);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-openai-api-key': apiKey,
      },
      body: formData,
    });

    onProgress?.(80);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError(response.status, errorData);
    }

    const data = await response.json();
    onProgress?.(100);

    return parseResponse(data, options, file instanceof File ? file.name : 'recording.webm');
  } catch (error: any) {
    // If it's already a TranscriptionError, re-throw it
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      throw error;
    }

    // For network errors or other issues
    const errorMessage = error instanceof Error
      ? error.message
      : (typeof error === 'string' ? error : 'Unknown error occurred');

    throw {
      code: 'NETWORK_ERROR',
      message: `Failed to connect to OpenAI: ${errorMessage}`,
      details: error instanceof Error ? error.stack : JSON.stringify(error),
    } as TranscriptionError;
  }
}

/**
 * Parse the API response into our Transcript format
 */
function parseResponse(
  data: OpenAITranscriptionResponse | OpenAIDiarizedResponse | OpenAIVerboseResponse,
  options: TranscriptionOptions,
  fileName: string
): Transcript {
  const id = crypto.randomUUID();
  const createdAt = new Date();

  // Handle diarized response
  if (options.model === 'gpt-4o-transcribe-diarize' && 'segments' in data && Array.isArray(data.segments)) {
    const diarizedData = data as OpenAIDiarizedResponse;
    const speakers = [...new Set(diarizedData.segments.map(s => s.speaker))];
    const speakerColors = assignSpeakerColors(speakers);

    const segments: TranscriptSegment[] = diarizedData.segments.map((seg, idx) => ({
      id: `seg-${idx}`,
      speaker: seg.speaker,
      text: seg.text,
      start: seg.start,
      end: seg.end,
    }));

    const duration = segments.length > 0
      ? Math.max(...segments.map(s => s.end))
      : 0;

    return {
      id,
      text: diarizedData.text,
      segments,
      duration,
      model: options.model,
      createdAt,
      fileName,
      speakerColors,
      speakerNames: {},
    };
  }

  // Handle verbose response (whisper-1 with timestamps)
  if ('duration' in data && data.duration !== undefined) {
    const verboseData = data as OpenAIVerboseResponse;

    // If there are word-level timestamps, create segments from them
    const segments: TranscriptSegment[] = verboseData.segments
      ? verboseData.segments.map((seg, idx) => ({
          id: `seg-${idx}`,
          speaker: 'speaker_0',
          text: seg.text.trim(),
          start: seg.start,
          end: seg.end,
        }))
      : [{
          id: 'seg-0',
          speaker: 'speaker_0',
          text: verboseData.text,
          start: 0,
          end: verboseData.duration,
        }];

    return {
      id,
      text: verboseData.text,
      segments,
      words: verboseData.words,
      duration: verboseData.duration,
      language: verboseData.language,
      model: options.model,
      createdAt,
      fileName,
      speakerColors: { speaker_0: 0 },
      speakerNames: {},
    };
  }

  // Handle basic JSON response
  const basicData = data as OpenAITranscriptionResponse;
  return {
    id,
    text: basicData.text,
    segments: [{
      id: 'seg-0',
      speaker: 'speaker_0',
      text: basicData.text,
      start: 0,
      end: 0, // Unknown duration
    }],
    duration: 0,
    model: options.model,
    createdAt,
    fileName,
    speakerColors: { speaker_0: 0 },
    speakerNames: {},
  };
}

/**
 * Create a structured error from API response
 */
function createError(status: number, errorData: any): TranscriptionError {
  const message = errorData?.error?.message || 'An error occurred during transcription';

  switch (status) {
    case 401:
      return {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key. Please check your OpenAI API key in settings.',
      };
    case 429:
      return {
        code: 'RATE_LIMITED',
        message: 'Rate limited. Please wait a moment and try again.',
      };
    case 400:
      if (message.includes('Invalid file format')) {
        return {
          code: 'INVALID_FORMAT',
          message: 'Unsupported audio format. Please use MP3, MP4, WAV, WEBM, or M4A.',
        };
      }
      return {
        code: 'BAD_REQUEST',
        message,
      };
    case 413:
      return {
        code: 'FILE_TOO_LARGE',
        message: 'File is too large. Maximum size is 25 MB per chunk.',
      };
    default:
      return {
        code: 'API_ERROR',
        message: `OpenAI API error: ${message}`,
        details: JSON.stringify(errorData),
      };
  }
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
  return key.startsWith('sk-') && key.length > 20;
}

import {
  TranscriptionOptions,
  Transcript,
  TranscriptSegment,
  ElevenLabsResponse,
  ElevenLabsWord,
  TranscriptionError,
} from '@/types/transcription';
import { assignSpeakerColors } from '@/lib/utils/colors';

// Use our API route to proxy requests to ElevenLabs (avoids CORS issues)
const API_URL = '/api/transcribe-elevenlabs';

/**
 * Transcribe an audio file using ElevenLabs Scribe API
 */
export async function transcribeWithElevenLabs(
  file: File | Blob,
  apiKey: string,
  options: TranscriptionOptions,
  onProgress?: (progress: number) => void
): Promise<Transcript> {
  const formData = new FormData();
  formData.append('file', file, file instanceof File ? file.name : 'recording.webm');

  // ElevenLabs Scribe API parameters
  formData.append('model_id', 'scribe_v1');

  // Enable diarization (speaker identification)
  formData.append('diarize', 'true');

  // Enable word-level timestamps
  formData.append('timestamps_granularity', 'word');

  // Add language if specified (ElevenLabs supports 99 languages)
  if (options.language && options.language !== 'auto') {
    formData.append('language_code', options.language);
  }

  try {
    onProgress?.(10);

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-elevenlabs-api-key': apiKey,
      },
      body: formData,
    });

    onProgress?.(80);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError(response.status, errorData);
    }

    const data: ElevenLabsResponse = await response.json();
    onProgress?.(100);

    return parseElevenLabsResponse(data, options, file instanceof File ? file.name : 'recording.webm');
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
      message: `Failed to connect to ElevenLabs: ${errorMessage}`,
      details: error instanceof Error ? error.stack : JSON.stringify(error),
    } as TranscriptionError;
  }
}

/**
 * Parse ElevenLabs API response into our Transcript format
 */
function parseElevenLabsResponse(
  data: ElevenLabsResponse,
  options: TranscriptionOptions,
  fileName: string
): Transcript {
  const id = crypto.randomUUID();
  const createdAt = new Date();

  // Group words by speaker to create segments
  const segments: TranscriptSegment[] = [];
  let currentSegment: {
    speaker: string;
    words: ElevenLabsWord[];
    start: number;
    end: number;
  } | null = null;

  // Process words and group by speaker
  for (const word of data.words) {
    // Skip spacing and audio events for segment creation
    if (word.type !== 'word') continue;

    const speakerId = word.speaker_id || 'speaker_0';

    if (!currentSegment || currentSegment.speaker !== speakerId) {
      // Save previous segment
      if (currentSegment && currentSegment.words.length > 0) {
        segments.push({
          id: `seg-${segments.length}`,
          speaker: currentSegment.speaker,
          text: currentSegment.words.map(w => w.text).join(''),
          start: currentSegment.start,
          end: currentSegment.end,
        });
      }

      // Start new segment
      currentSegment = {
        speaker: speakerId,
        words: [word],
        start: word.start,
        end: word.end,
      };
    } else {
      // Continue current segment
      currentSegment.words.push(word);
      currentSegment.end = word.end;
    }
  }

  // Don't forget the last segment
  if (currentSegment && currentSegment.words.length > 0) {
    segments.push({
      id: `seg-${segments.length}`,
      speaker: currentSegment.speaker,
      text: currentSegment.words.map(w => w.text).join(''),
      start: currentSegment.start,
      end: currentSegment.end,
    });
  }

  // Get unique speakers and assign colors
  const speakers = [...new Set(segments.map(s => s.speaker))];
  const speakerColors = assignSpeakerColors(speakers);

  // Calculate duration from last word
  const duration = data.words.length > 0
    ? Math.max(...data.words.filter(w => w.type === 'word').map(w => w.end))
    : 0;

  // Convert ElevenLabs words to our TranscriptWord format
  const words = data.words
    .filter(w => w.type === 'word')
    .map(w => ({
      word: w.text,
      start: w.start,
      end: w.end,
    }));

  return {
    id,
    text: data.text,
    segments,
    words,
    duration,
    language: data.language_code,
    model: options.model,
    createdAt,
    fileName,
    speakerColors,
    speakerNames: {},
  };
}

/**
 * Create a structured error from API response
 */
function createError(status: number, errorData: any): TranscriptionError {
  const message = errorData?.detail?.message || errorData?.message || errorData?.error || 'An error occurred during transcription';

  switch (status) {
    case 401:
      return {
        code: 'INVALID_API_KEY',
        message: 'Invalid API key. Please check your ElevenLabs API key in settings.',
      };
    case 403:
      return {
        code: 'FORBIDDEN',
        message: 'Access denied. Your ElevenLabs plan may not include Scribe access.',
      };
    case 429:
      return {
        code: 'RATE_LIMITED',
        message: 'Rate limited. Please wait a moment and try again.',
      };
    case 400:
      if (message.includes('format') || message.includes('audio')) {
        return {
          code: 'INVALID_FORMAT',
          message: 'Unsupported audio format. ElevenLabs supports most common audio formats.',
        };
      }
      return {
        code: 'BAD_REQUEST',
        message,
      };
    case 413:
      return {
        code: 'FILE_TOO_LARGE',
        message: 'File is too large for ElevenLabs processing.',
      };
    default:
      return {
        code: 'API_ERROR',
        message: `ElevenLabs API error: ${message}`,
        details: JSON.stringify(errorData),
      };
  }
}

/**
 * Validate ElevenLabs API key format
 */
export function isValidElevenLabsKeyFormat(key: string): boolean {
  // ElevenLabs keys are typically 32 hex characters
  return key.length >= 20;
}

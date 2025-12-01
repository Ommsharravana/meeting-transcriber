'use client';

import { transcribeAudio } from '@/lib/openai/transcribe';
import { transcribeDualModel, DualModelProgress } from '@/lib/openai/dualModelTranscribe';
import { transcribeWithElevenLabs } from '@/lib/elevenlabs/transcribe';
import {
  TranscriptionOptions,
  Transcript,
  TranscriptSegment,
  getProviderFromModel,
} from '@/types/transcription';
import { assignSpeakerColors } from '@/lib/utils/colors';

export interface ChunkProgress {
  phase: 'analyzing' | 'chunking' | 'transcribing' | 'merging' | 'complete' | 'quality' | 'diarization';
  overallProgress: number;
  currentChunk?: number;
  totalChunks?: number;
  message: string;
}

interface SplitResponse {
  needsChunking: boolean;
  duration: number;
  totalChunks?: number;
  chunks: Array<{
    index: number;
    data: string; // base64
    mimeType: string;
  }>;
  error?: string;
}

/**
 * Get audio duration using HTML5 Audio element (browser API)
 */
async function getAudioDurationFromBrowser(file: File): Promise<number> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.addEventListener('loadedmetadata', () => {
      URL.revokeObjectURL(url);
      if (audio.duration && isFinite(audio.duration)) {
        console.log('[Browser Audio] Got duration:', audio.duration);
        resolve(audio.duration);
      } else {
        reject(new Error('Duration not available'));
      }
    });

    audio.addEventListener('error', (e) => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load audio: ' + (e as ErrorEvent).message));
    });

    // Timeout after 10 seconds
    setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Timeout loading audio metadata'));
    }, 10000);

    audio.src = url;
  });
}

/**
 * Check if file needs chunking based on duration
 */
export async function needsChunking(file: File): Promise<{ needs: boolean; duration: number; estimatedChunks: number }> {
  const MAX_DURATION = 1200; // 20 minutes (safe margin under 23 min limit)
  const CHUNK_DURATION = 600; // 10 minutes per chunk

  console.log('[Chunker] Checking if file needs chunking:', file.name, 'size:', file.size);

  // Try browser Audio API (works for most formats)
  try {
    console.log('[Chunker] Trying browser Audio API...');
    const duration = await getAudioDurationFromBrowser(file);

    if (duration > 0) {
      const needs = duration > MAX_DURATION;
      const estimatedChunks = needs ? Math.ceil(duration / CHUNK_DURATION) : 1;
      console.log('[Chunker] Browser Audio result:', { needs, duration, estimatedChunks });
      return { needs, duration, estimatedChunks };
    }
  } catch (error) {
    console.log('[Chunker] Browser Audio failed:', error);
  }

  // Last resort: file size estimation
  // Be very conservative: assume ~24kbps (low quality voice) = 3KB/second
  console.log('[Chunker] Using file size fallback...');
  const MAX_SIZE_FOR_DIRECT = 5 * 1024 * 1024; // 5MB (very conservative)
  const needs = file.size > MAX_SIZE_FOR_DIRECT;
  const estimatedDuration = file.size / 3000;
  const estimatedChunks = needs ? Math.ceil(estimatedDuration / CHUNK_DURATION) : 1;

  console.log('[Chunker] File size fallback result:', { needs, estimatedDuration, estimatedChunks, fileSize: file.size });
  return { needs, duration: estimatedDuration, estimatedChunks };
}

/**
 * Split audio using server-side API (uses native ffmpeg)
 */
async function splitAudioServerSide(
  file: File,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob[]> {
  onProgress?.(5, 'Uploading audio for processing...');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('chunkDuration', '600'); // 10 minutes

  const response = await fetch('/api/split-audio', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || 'Failed to split audio');
  }

  const data: SplitResponse = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  onProgress?.(50, `Processing ${data.chunks.length} chunks...`);

  // Convert base64 chunks back to Blobs
  const chunks = data.chunks.map((chunk) => {
    const binaryString = atob(chunk.data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Blob([bytes], { type: chunk.mimeType });
  });

  onProgress?.(90, 'Chunking complete!');

  return chunks;
}

/**
 * Transcribe audio with automatic chunking for long files
 */
export async function transcribeWithChunking(
  file: File,
  apiKey: string,
  options: TranscriptionOptions,
  onProgress?: (progress: ChunkProgress) => void
): Promise<Transcript> {
  console.log('[Chunker] Starting transcription for:', file.name, 'size:', file.size);
  console.log('[Chunker] Dual model mode:', options.dualModelMode);

  // Check which provider to use based on the selected model
  const provider = getProviderFromModel(options.model);
  console.log('[Chunker] Provider:', provider, 'Model:', options.model);

  // Route to ElevenLabs for ElevenLabs models (no chunking needed - ElevenLabs handles long files)
  if (provider === 'elevenlabs') {
    console.log('[Chunker] Using ElevenLabs Scribe transcription');

    onProgress?.({
      phase: 'transcribing',
      overallProgress: 10,
      currentChunk: 1,
      totalChunks: 1,
      message: 'Transcribing with ElevenLabs Scribe...',
    });

    const transcript = await transcribeWithElevenLabs(
      file,
      apiKey,
      options,
      (progress) => {
        onProgress?.({
          phase: 'transcribing',
          overallProgress: 10 + progress * 0.85,
          currentChunk: 1,
          totalChunks: 1,
          message: 'Transcribing with ElevenLabs Scribe...',
        });
      }
    );

    onProgress?.({
      phase: 'complete',
      overallProgress: 100,
      message: 'Transcription complete!',
    });

    return transcript;
  }

  // If dual model mode is enabled, use the special dual model function
  if (options.dualModelMode) {
    console.log('[Chunker] Using dual model transcription (GPT-4o Transcribe + Diarize)');

    return transcribeDualModel(
      file,
      apiKey,
      options,
      (dualProgress) => {
        onProgress?.({
          phase: dualProgress.phase,
          overallProgress: dualProgress.overallProgress,
          message: dualProgress.message,
        });
      }
    );
  }

  // Check if chunking is needed
  onProgress?.({
    phase: 'analyzing',
    overallProgress: 5,
    message: 'Analyzing audio file...',
  });

  let chunkInfo;
  try {
    chunkInfo = await needsChunking(file);
    console.log('[Chunker] Chunk analysis result:', chunkInfo);
  } catch (error) {
    console.error('[Chunker] Error analyzing file:', error);
    // Default to chunking for large files on error
    const estimatedDuration = file.size / 3000;
    chunkInfo = {
      needs: file.size > 5 * 1024 * 1024,
      duration: estimatedDuration,
      estimatedChunks: Math.ceil(estimatedDuration / 600)
    };
    console.log('[Chunker] Using fallback chunk info:', chunkInfo);
  }

  if (!chunkInfo.needs) {
    // File is short enough, transcribe directly
    onProgress?.({
      phase: 'transcribing',
      overallProgress: 10,
      currentChunk: 1,
      totalChunks: 1,
      message: 'Transcribing audio...',
    });

    const transcript = await transcribeAudio(
      file,
      apiKey,
      options,
      (progress) => {
        onProgress?.({
          phase: 'transcribing',
          overallProgress: 10 + progress * 0.85,
          currentChunk: 1,
          totalChunks: 1,
          message: 'Transcribing audio...',
        });
      }
    );

    onProgress?.({
      phase: 'complete',
      overallProgress: 100,
      message: 'Transcription complete!',
    });

    return transcript;
  }

  // File needs chunking - use server-side splitting
  const totalChunks = chunkInfo.estimatedChunks;

  onProgress?.({
    phase: 'chunking',
    overallProgress: 10,
    totalChunks,
    message: `Splitting audio into ${totalChunks} chunks (server-side)...`,
  });

  // Split the audio using server API
  let chunks: Blob[];
  try {
    chunks = await splitAudioServerSide(file, (progress, message) => {
      onProgress?.({
        phase: 'chunking',
        overallProgress: 10 + (progress / 100) * 20, // 10-30%
        totalChunks,
        message,
      });
    });
  } catch (error) {
    console.error('[Chunker] Server-side splitting failed:', error);
    throw new Error(
      `Failed to split audio: ${error instanceof Error ? error.message : 'Unknown error'}. ` +
      'Make sure ffmpeg is installed on the server.'
    );
  }

  // Transcribe each chunk
  const chunkTranscripts: Transcript[] = [];
  const chunkProgressStart = 30;
  const chunkProgressEnd = 90;
  const progressPerChunk = (chunkProgressEnd - chunkProgressStart) / chunks.length;

  for (let i = 0; i < chunks.length; i++) {
    onProgress?.({
      phase: 'transcribing',
      overallProgress: chunkProgressStart + i * progressPerChunk,
      currentChunk: i + 1,
      totalChunks: chunks.length,
      message: `Transcribing chunk ${i + 1} of ${chunks.length}...`,
    });

    const chunkTranscript = await transcribeAudio(
      new File([chunks[i]], `chunk_${i}.mp3`, { type: 'audio/mp3' }),
      apiKey,
      options,
      (progress) => {
        const baseProgress = chunkProgressStart + i * progressPerChunk;
        const chunkProgress = progress * (progressPerChunk / 100);
        onProgress?.({
          phase: 'transcribing',
          overallProgress: baseProgress + chunkProgress,
          currentChunk: i + 1,
          totalChunks: chunks.length,
          message: `Transcribing chunk ${i + 1} of ${chunks.length}...`,
        });
      }
    );

    chunkTranscripts.push(chunkTranscript);
  }

  // Merge transcripts
  onProgress?.({
    phase: 'merging',
    overallProgress: 92,
    totalChunks: chunks.length,
    message: 'Merging transcripts...',
  });

  const mergedTranscript = mergeTranscripts(chunkTranscripts, file.name, options);

  onProgress?.({
    phase: 'complete',
    overallProgress: 100,
    message: 'Transcription complete!',
  });

  return mergedTranscript;
}

/**
 * Merge multiple transcript chunks into one
 */
function mergeTranscripts(
  transcripts: Transcript[],
  fileName: string,
  options: TranscriptionOptions
): Transcript {
  if (transcripts.length === 0) {
    throw new Error('No transcripts to merge');
  }

  if (transcripts.length === 1) {
    return transcripts[0];
  }

  const CHUNK_DURATION = 600; // 10 minutes per chunk

  // Merge all segments with adjusted timestamps
  const allSegments: TranscriptSegment[] = [];
  let currentTimeOffset = 0;
  let segmentCounter = 0;

  for (let chunkIndex = 0; chunkIndex < transcripts.length; chunkIndex++) {
    const transcript = transcripts[chunkIndex];

    for (const segment of transcript.segments) {
      allSegments.push({
        ...segment,
        id: `seg-${segmentCounter++}`,
        start: segment.start + currentTimeOffset,
        end: segment.end + currentTimeOffset,
      });
    }

    // Calculate time offset for next chunk
    const lastSegment = transcript.segments[transcript.segments.length - 1];
    if (lastSegment) {
      currentTimeOffset += Math.max(lastSegment.end, CHUNK_DURATION);
    } else {
      currentTimeOffset += CHUNK_DURATION;
    }
  }

  // Collect all unique speakers
  const allSpeakers = [...new Set(allSegments.map((s) => s.speaker))];
  const speakerColors = assignSpeakerColors(allSpeakers);

  // Calculate total duration
  const totalDuration = allSegments.length > 0
    ? Math.max(...allSegments.map((s) => s.end))
    : 0;

  // Merge all text
  const fullText = transcripts.map((t) => t.text).join(' ');

  return {
    id: crypto.randomUUID(),
    text: fullText,
    segments: allSegments,
    duration: totalDuration,
    model: options.model,
    createdAt: new Date(),
    fileName,
    speakerColors,
    speakerNames: {},
  };
}

'use client';

// Version 2.0 - Browser-side chunking (no FFmpeg required)
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
 * Split audio in the browser using Web Audio API
 * This works on any platform including Vercel without FFmpeg
 */
async function splitAudioBrowserSide(
  file: File,
  chunkDurationSeconds: number,
  onProgress?: (progress: number, message: string) => void
): Promise<Blob[]> {
  onProgress?.(5, 'Loading audio file...');

  // Get the audio context
  const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();

  // Read file as array buffer
  const arrayBuffer = await file.arrayBuffer();
  onProgress?.(15, 'Decoding audio...');

  // Decode audio data
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  const sampleRate = audioBuffer.sampleRate;
  const numberOfChannels = audioBuffer.numberOfChannels;
  const totalDuration = audioBuffer.duration;

  const numChunks = Math.ceil(totalDuration / chunkDurationSeconds);
  const chunks: Blob[] = [];

  onProgress?.(25, `Splitting into ${numChunks} chunks...`);

  for (let i = 0; i < numChunks; i++) {
    const startTime = i * chunkDurationSeconds;
    const endTime = Math.min((i + 1) * chunkDurationSeconds, totalDuration);
    const chunkDuration = endTime - startTime;

    // Calculate sample positions
    const startSample = Math.floor(startTime * sampleRate);
    const endSample = Math.floor(endTime * sampleRate);
    const chunkLength = endSample - startSample;

    // Create a new buffer for this chunk
    const chunkBuffer = audioContext.createBuffer(
      numberOfChannels,
      chunkLength,
      sampleRate
    );

    // Copy data for each channel
    for (let channel = 0; channel < numberOfChannels; channel++) {
      const sourceData = audioBuffer.getChannelData(channel);
      const destData = chunkBuffer.getChannelData(channel);
      for (let j = 0; j < chunkLength; j++) {
        destData[j] = sourceData[startSample + j];
      }
    }

    // Convert to WAV blob (WAV is simpler and widely supported)
    const wavBlob = audioBufferToWav(chunkBuffer);
    chunks.push(wavBlob);

    const progress = 25 + ((i + 1) / numChunks) * 65;
    onProgress?.(progress, `Created chunk ${i + 1} of ${numChunks}...`);
  }

  await audioContext.close();
  onProgress?.(95, 'Chunking complete!');

  return chunks;
}

/**
 * Convert AudioBuffer to WAV Blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const bytesPerSample = bitDepth / 8;
  const blockAlign = numChannels * bytesPerSample;

  // Interleave channels
  const length = buffer.length * numChannels;
  const samples = new Int16Array(length);

  for (let i = 0; i < buffer.length; i++) {
    for (let channel = 0; channel < numChannels; channel++) {
      const sample = buffer.getChannelData(channel)[i];
      // Convert float to int16
      const s = Math.max(-1, Math.min(1, sample));
      samples[i * numChannels + channel] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
  }

  const dataLength = samples.length * bytesPerSample;
  const bufferLength = 44 + dataLength;
  const arrayBuffer = new ArrayBuffer(bufferLength);
  const view = new DataView(arrayBuffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, bufferLength - 8, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true); // Subchunk1Size
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  // Write samples
  const offset = 44;
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(offset + i * 2, samples[i], true);
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, string: string): void {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Split audio using server-side API (uses native ffmpeg)
 * Falls back to browser-side if server fails
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

  // File needs chunking - try browser-side first (works on Vercel), then server-side
  const totalChunks = chunkInfo.estimatedChunks;
  const CHUNK_DURATION_SECONDS = 600; // 10 minutes

  onProgress?.({
    phase: 'chunking',
    overallProgress: 10,
    totalChunks,
    message: `Splitting audio into ${totalChunks} chunks...`,
  });

  // Split the audio - try browser-side first (no FFmpeg needed)
  let chunks: Blob[];
  try {
    console.log('[Chunker] Trying browser-side audio splitting...');
    chunks = await splitAudioBrowserSide(file, CHUNK_DURATION_SECONDS, (progress, message) => {
      onProgress?.({
        phase: 'chunking',
        overallProgress: 10 + (progress / 100) * 20, // 10-30%
        totalChunks,
        message,
      });
    });
    console.log('[Chunker] Browser-side splitting succeeded:', chunks.length, 'chunks');
  } catch (browserError) {
    console.warn('[Chunker] Browser-side splitting failed, trying server-side:', browserError);

    // Fall back to server-side (requires FFmpeg)
    try {
      chunks = await splitAudioServerSide(file, (progress, message) => {
        onProgress?.({
          phase: 'chunking',
          overallProgress: 10 + (progress / 100) * 20,
          totalChunks,
          message: message + ' (server)',
        });
      });
      console.log('[Chunker] Server-side splitting succeeded:', chunks.length, 'chunks');
    } catch (serverError) {
      console.error('[Chunker] Both splitting methods failed');
      throw new Error(
        `Failed to split audio. Browser error: ${browserError instanceof Error ? browserError.message : 'Unknown'}. ` +
        `Server error: ${serverError instanceof Error ? serverError.message : 'Unknown'}.`
      );
    }
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

    // Use the actual blob type (WAV for browser-side, MP3 for server-side)
    const chunkType = chunks[i].type || 'audio/wav';
    const chunkExt = chunkType.includes('wav') ? 'wav' : 'mp3';
    const chunkTranscript = await transcribeAudio(
      new File([chunks[i]], `chunk_${i}.${chunkExt}`, { type: chunkType }),
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

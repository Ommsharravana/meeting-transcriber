'use client';

import { Transcript, TranscriptSegment } from '@/types/transcription';
import { formatTime } from './time';

/**
 * Copy text to clipboard with fallback for older browsers
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    // Modern API
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();

    const successful = document.execCommand('copy');
    document.body.removeChild(textarea);
    return successful;
  } catch (error) {
    console.error('Failed to copy to clipboard:', error);
    return false;
  }
}

/**
 * Format a single segment as plain text
 */
export function formatSegmentAsText(
  segment: TranscriptSegment,
  speakerName?: string
): string {
  const speaker = speakerName || formatSpeakerId(segment.speaker);
  const timestamp = formatTime(segment.start);
  return `[${timestamp}] ${speaker}: ${segment.text}`;
}

/**
 * Format entire transcript as plain text for copying
 */
export function formatTranscriptAsText(transcript: Transcript): string {
  const lines: string[] = [];

  // Header
  lines.push(`Meeting Transcript: ${transcript.fileName}`);
  lines.push(`Date: ${new Date(transcript.createdAt).toLocaleString()}`);
  lines.push(`Duration: ${formatDuration(transcript.duration)}`);
  lines.push(`Speakers: ${Object.keys(transcript.speakerColors).length}`);
  lines.push(`Model: ${transcript.model}`);
  lines.push('');
  lines.push('---');
  lines.push('');

  // Segments
  for (const segment of transcript.segments) {
    const speakerName = transcript.speakerNames[segment.speaker];
    lines.push(formatSegmentAsText(segment, speakerName));
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format filtered segments as plain text
 */
export function formatSegmentsAsText(
  segments: TranscriptSegment[],
  speakerNames: Record<string, string>
): string {
  return segments
    .map((segment) => formatSegmentAsText(segment, speakerNames[segment.speaker]))
    .join('\n\n');
}

/**
 * Format speaker ID into readable format
 */
function formatSpeakerId(speaker: string): string {
  const match = speaker.match(/speaker_(\d+)/i);
  if (match) {
    return `Speaker ${parseInt(match[1]) + 1}`;
  }
  // Handle "A", "B", etc.
  if (speaker.length === 1 && /[A-Z]/i.test(speaker)) {
    return `Speaker ${speaker.toUpperCase()}`;
  }
  return speaker;
}

/**
 * Format duration in seconds to readable string
 */
function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

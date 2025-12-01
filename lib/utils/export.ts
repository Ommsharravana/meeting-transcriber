'use client';

import { Transcript, TranscriptSegment } from '@/types/transcription';
import { formatTime } from './time';

/**
 * Format speaker ID into readable format
 */
function formatSpeakerId(speaker: string): string {
  const match = speaker.match(/speaker_(\d+)/i);
  if (match) {
    return `Speaker ${parseInt(match[1]) + 1}`;
  }
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

/**
 * Export transcript as plain text
 */
export function exportAsText(transcript: Transcript): string {
  const lines: string[] = [];

  // Header
  lines.push(`Meeting Transcript: ${transcript.fileName}`);
  lines.push(`Date: ${new Date(transcript.createdAt).toLocaleString()}`);
  lines.push(`Duration: ${formatDuration(transcript.duration)}`);
  lines.push(`Speakers: ${Object.keys(transcript.speakerColors).length}`);
  lines.push(`Model: ${transcript.model}`);
  lines.push('');
  lines.push('═'.repeat(60));
  lines.push('');

  // Segments
  for (const segment of transcript.segments) {
    const speakerName = transcript.speakerNames[segment.speaker] || formatSpeakerId(segment.speaker);
    const timestamp = formatTime(segment.start);
    lines.push(`[${timestamp}] ${speakerName}:`);
    lines.push(segment.text);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Format time for SRT (HH:MM:SS,mmm)
 */
function formatSrtTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}

/**
 * Export transcript as SRT subtitle format
 */
export function exportAsSrt(transcript: Transcript): string {
  const lines: string[] = [];

  transcript.segments.forEach((segment, index) => {
    const speakerName = transcript.speakerNames[segment.speaker] || formatSpeakerId(segment.speaker);
    const startTime = formatSrtTime(segment.start);
    const endTime = formatSrtTime(segment.end);

    lines.push(`${index + 1}`);
    lines.push(`${startTime} --> ${endTime}`);
    lines.push(`[${speakerName}] ${segment.text}`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Export transcript as JSON
 */
export function exportAsJson(transcript: Transcript): string {
  const exportData = {
    metadata: {
      fileName: transcript.fileName,
      createdAt: transcript.createdAt,
      duration: transcript.duration,
      model: transcript.model,
      speakerCount: Object.keys(transcript.speakerColors).length,
    },
    speakers: Object.entries(transcript.speakerNames).map(([id, name]) => ({
      id,
      name: name || formatSpeakerId(id),
      color: transcript.speakerColors[id],
    })),
    segments: transcript.segments.map((segment) => ({
      id: segment.id,
      speaker: segment.speaker,
      speakerName: transcript.speakerNames[segment.speaker] || formatSpeakerId(segment.speaker),
      start: segment.start,
      end: segment.end,
      text: segment.text,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

/**
 * Export transcript as VTT (WebVTT) format
 */
export function exportAsVtt(transcript: Transcript): string {
  const lines: string[] = ['WEBVTT', ''];

  transcript.segments.forEach((segment) => {
    const speakerName = transcript.speakerNames[segment.speaker] || formatSpeakerId(segment.speaker);
    const startTime = formatVttTime(segment.start);
    const endTime = formatVttTime(segment.end);

    lines.push(`${startTime} --> ${endTime}`);
    lines.push(`<v ${speakerName}>${segment.text}`);
    lines.push('');
  });

  return lines.join('\n');
}

/**
 * Format time for VTT (HH:MM:SS.mmm)
 */
function formatVttTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
}

/**
 * Generate HTML for PDF export
 */
export function exportAsHtml(transcript: Transcript): string {
  const speakerColors: Record<number, string> = {
    0: '#06B6D4', // cyan
    1: '#A78BFA', // violet
    2: '#F472B6', // pink
    3: '#34D399', // emerald
    4: '#FBBF24', // amber
    5: '#F87171', // red
  };

  const getSpeakerColor = (colorIndex: number) => speakerColors[colorIndex % 6] || speakerColors[0];

  const segments = transcript.segments.map((segment) => {
    const speakerName = transcript.speakerNames[segment.speaker] || formatSpeakerId(segment.speaker);
    const colorIndex = transcript.speakerColors[segment.speaker] || 0;
    const color = getSpeakerColor(colorIndex);
    const timestamp = formatTime(segment.start);

    return `
      <div style="margin-bottom: 16px; padding-left: 12px; border-left: 3px solid ${color};">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
          <span style="font-size: 12px; color: #666; font-family: monospace;">${timestamp}</span>
          <span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 500;">${speakerName}</span>
        </div>
        <p style="margin: 0; line-height: 1.6;">${segment.text}</p>
      </div>
    `;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Transcript - ${transcript.fileName}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 40px 20px;
      color: #1a1a1a;
      line-height: 1.6;
    }
    h1 {
      font-size: 24px;
      margin-bottom: 8px;
    }
    .meta {
      color: #666;
      font-size: 14px;
      margin-bottom: 24px;
      padding-bottom: 16px;
      border-bottom: 1px solid #eee;
    }
    .meta span {
      margin-right: 16px;
    }
    @media print {
      body { padding: 20px; }
    }
  </style>
</head>
<body>
  <h1>${transcript.fileName}</h1>
  <div class="meta">
    <span>Date: ${new Date(transcript.createdAt).toLocaleString()}</span>
    <span>Duration: ${formatDuration(transcript.duration)}</span>
    <span>Speakers: ${Object.keys(transcript.speakerColors).length}</span>
  </div>
  ${segments}
</body>
</html>
  `.trim();
}

/**
 * Download a file with the given content
 */
export function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export types
 */
export type ExportFormat = 'txt' | 'srt' | 'vtt' | 'json' | 'html';

/**
 * Export transcript in specified format
 */
export function exportTranscript(transcript: Transcript, format: ExportFormat): void {
  const baseName = transcript.fileName.replace(/\.[^/.]+$/, '');

  switch (format) {
    case 'txt':
      downloadFile(exportAsText(transcript), `${baseName}-transcript.txt`, 'text/plain');
      break;
    case 'srt':
      downloadFile(exportAsSrt(transcript), `${baseName}-subtitles.srt`, 'text/plain');
      break;
    case 'vtt':
      downloadFile(exportAsVtt(transcript), `${baseName}-subtitles.vtt`, 'text/vtt');
      break;
    case 'json':
      downloadFile(exportAsJson(transcript), `${baseName}-transcript.json`, 'application/json');
      break;
    case 'html':
      downloadFile(exportAsHtml(transcript), `${baseName}-transcript.html`, 'text/html');
      break;
  }
}

'use client';

import { cn } from '@/lib/utils';
import { getSpeakerColor } from '@/lib/utils/colors';

interface SpeakerBadgeProps {
  speaker: string;
  speakerName?: string;
  colorIndex: number;
  onClick?: () => void;
  size?: 'sm' | 'md';
  asSpan?: boolean;
}

export function SpeakerBadge({
  speaker,
  speakerName,
  colorIndex,
  onClick,
  size = 'md',
  asSpan = false,
}: SpeakerBadgeProps) {
  const color = getSpeakerColor(colorIndex);
  const displayName = speakerName || formatSpeakerId(speaker);

  const className = cn(
    'inline-flex items-center gap-1.5 font-medium rounded-full transition-all',
    'hover:ring-2',
    color.bg,
    color.text,
    color.border,
    color.ring,
    'border',
    onClick && 'cursor-pointer hover:opacity-80',
    !onClick && 'cursor-default',
    size === 'sm' && 'px-2 py-0.5 text-xs',
    size === 'md' && 'px-3 py-1 text-sm'
  );

  const content = (
    <>
      <span
        className={cn(
          'rounded-full',
          color.bgSolid,
          size === 'sm' && 'w-1.5 h-1.5',
          size === 'md' && 'w-2 h-2'
        )}
      />
      {displayName}
    </>
  );

  // Render as span when nested inside buttons (sidebar) to avoid hydration errors
  if (asSpan) {
    return (
      <span className={className}>
        {content}
      </span>
    );
  }

  return (
    <button onClick={onClick} className={className}>
      {content}
    </button>
  );
}

function formatSpeakerId(speaker: string): string {
  // Convert "speaker_0" to "Speaker 1"
  const match = speaker.match(/speaker_(\d+)/i);
  if (match) {
    return `Speaker ${parseInt(match[1]) + 1}`;
  }
  return speaker;
}

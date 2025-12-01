'use client';

import { useState } from 'react';
import { Edit2, Check, X, Copy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SpeakerBadge } from './SpeakerBadge';
import { TranscriptSegment } from '@/types/transcription';
import { getSpeakerColor } from '@/lib/utils/colors';
import { formatTime } from '@/lib/utils/time';
import { copyToClipboard, formatSegmentAsText } from '@/lib/utils/clipboard';
import { toast } from 'sonner';

interface SpeakerSegmentProps {
  segment: TranscriptSegment;
  speakerName?: string;
  colorIndex: number;
  searchQuery?: string;
  onRenameSpeaker?: (newName: string) => void;
}

export function SpeakerSegment({
  segment,
  speakerName,
  colorIndex,
  searchQuery,
  onRenameSpeaker,
}: SpeakerSegmentProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(speakerName || '');
  const color = getSpeakerColor(colorIndex);

  const handleSave = () => {
    if (editName.trim()) {
      onRenameSpeaker?.(editName.trim());
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(speakerName || '');
    setIsEditing(false);
  };

  const handleCopySegment = async () => {
    const text = formatSegmentAsText(segment, speakerName);
    const success = await copyToClipboard(text);
    if (success) {
      toast.success('Segment copied to clipboard');
    } else {
      toast.error('Failed to copy');
    }
  };

  // Highlight search matches in text
  const highlightedText = searchQuery
    ? highlightMatches(segment.text, searchQuery)
    : segment.text;

  return (
    <div
      className={cn(
        'group relative pl-4 py-4 border-l-2 transition-colors',
        color.border,
        'hover:bg-muted/30'
      )}
    >
      {/* Timestamp */}
      <div className="absolute -left-[1px] top-4 -translate-x-full pr-4">
        <span className="text-xs font-mono text-muted-foreground tabular-nums">
          {formatTime(segment.start)}
        </span>
      </div>

      <div className="space-y-2">
        {/* Speaker Header */}
        <div className="flex items-center gap-2">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter speaker name"
                className="h-8 w-40 text-sm"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave();
                  if (e.key === 'Escape') handleCancel();
                }}
              />
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleSave} aria-label="Save speaker name">
                <Check className="w-4 h-4 text-emerald-500" aria-hidden="true" />
              </Button>
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={handleCancel} aria-label="Cancel editing">
                <X className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
              </Button>
            </div>
          ) : (
            <>
              <SpeakerBadge
                speaker={segment.speaker}
                speakerName={speakerName}
                colorIndex={colorIndex}
              />
              <Button
                size="icon"
                variant="ghost"
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={handleCopySegment}
                title="Copy segment"
                aria-label="Copy segment"
              >
                <Copy className="w-3 h-3" aria-hidden="true" />
              </Button>
              {onRenameSpeaker && (
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => setIsEditing(true)}
                  title="Rename speaker"
                  aria-label="Rename speaker"
                >
                  <Edit2 className="w-3 h-3" aria-hidden="true" />
                </Button>
              )}
            </>
          )}
        </div>

        {/* Text Content */}
        <p className="text-sm leading-relaxed text-foreground/90">
          {typeof highlightedText === 'string' ? highlightedText : highlightedText}
        </p>
      </div>
    </div>
  );
}

function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, idx) =>
        regex.test(part) ? (
          <mark key={idx} className="bg-primary/30 text-foreground rounded px-0.5">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  );
}

function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Download, Users, Clock, FileText, Plus, Copy, FileDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { SpeakerSegment } from './SpeakerSegment';
import { SpeakerBadge } from './SpeakerBadge';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { formatDuration } from '@/lib/utils/time';
import { getSpeakerColor } from '@/lib/utils/colors';
import { copyToClipboard, formatTranscriptAsText, formatSegmentsAsText } from '@/lib/utils/clipboard';
import { exportTranscript, ExportFormat } from '@/lib/utils/export';
import { toast } from 'sonner';
import { AISummary } from '@/components/ai/AISummary';
import { ActionItemsPanel } from '@/components/actions/ActionItemsPanel';
import { MeetingWiki } from '@/components/wiki/MeetingWiki';

export function TranscriptView() {
  const {
    transcript,
    speakerFilter,
    searchQuery,
    setSpeakerFilter,
    setSearchQuery,
    renameSpeaker,
    reset,
  } = useTranscriptionStore();

  const [localSearch, setLocalSearch] = useState('');

  if (!transcript) return null;

  const speakers = useMemo(() => {
    const uniqueSpeakers = [...new Set(transcript.segments.map(s => s.speaker))];
    return uniqueSpeakers.map(speaker => ({
      id: speaker,
      name: transcript.speakerNames[speaker],
      colorIndex: transcript.speakerColors[speaker] || 0,
      segmentCount: transcript.segments.filter(s => s.speaker === speaker).length,
    }));
  }, [transcript]);

  const filteredSegments = useMemo(() => {
    let segments = transcript.segments;

    // Filter by speaker
    if (speakerFilter) {
      segments = segments.filter(s => s.speaker === speakerFilter);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      segments = segments.filter(s => s.text.toLowerCase().includes(query));
    }

    return segments;
  }, [transcript.segments, speakerFilter, searchQuery]);

  const handleSearch = () => {
    setSearchQuery(localSearch);
  };

  const handleClearFilters = () => {
    setSpeakerFilter(null);
    setSearchQuery('');
    setLocalSearch('');
  };

  const handleCopyAll = async () => {
    const text = formatTranscriptAsText(transcript);
    const success = await copyToClipboard(text);
    if (success) {
      toast.success('Transcript copied to clipboard');
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleCopyFiltered = async () => {
    const text = formatSegmentsAsText(filteredSegments, transcript.speakerNames);
    const success = await copyToClipboard(text);
    if (success) {
      toast.success(`${filteredSegments.length} segments copied to clipboard`);
    } else {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleExport = (format: ExportFormat) => {
    try {
      exportTranscript(transcript, format);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (error) {
      toast.error('Failed to export transcript');
    }
  };

  const hasFilters = speakerFilter || searchQuery;

  return (
    <div className="flex flex-col h-full rounded-2xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border space-y-4">
        {/* Stats Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4" aria-hidden="true" />
              <span>{speakers.length} speakers</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="w-4 h-4" aria-hidden="true" />
              <span>{formatDuration(transcript.duration)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <FileText className="w-4 h-4" aria-hidden="true" />
              <span>{transcript.segments.length} segments</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={hasFilters ? handleCopyFiltered : handleCopyAll}
              className="gap-2"
              aria-label={hasFilters ? 'Copy filtered segments to clipboard' : 'Copy full transcript to clipboard'}
            >
              <Copy className="w-4 h-4" aria-hidden="true" />
              {hasFilters ? 'Copy Filtered' : 'Copy All'}
            </Button>

            {/* Export Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2" aria-label="Export transcript">
                  <FileDown className="w-4 h-4" aria-hidden="true" />
                  Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Export Format</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('txt')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Plain Text (.txt)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('srt')}>
                  <FileText className="w-4 h-4 mr-2" />
                  Subtitles (.srt)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('vtt')}>
                  <FileText className="w-4 h-4 mr-2" />
                  WebVTT (.vtt)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('json')}>
                  <FileText className="w-4 h-4 mr-2" />
                  JSON (.json)
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => handleExport('html')}>
                  <FileText className="w-4 h-4 mr-2" />
                  HTML (Print/PDF)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* AI Summary */}
            <AISummary transcript={transcript.text} />

            {/* Meeting Wiki */}
            <MeetingWiki transcript={transcript.text} />

            <Button variant="outline" size="sm" onClick={reset} className="gap-2" aria-label="Start new transcription">
              <Plus className="w-4 h-4" aria-hidden="true" />
              New Transcription
            </Button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              placeholder="Search transcript..."
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="pl-9 h-9"
              aria-label="Search transcript"
            />
          </div>
          <Button size="sm" variant="secondary" onClick={handleSearch}>
            Search
          </Button>

          {/* Speaker Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="gap-2" aria-label="Filter by speaker">
                <Filter className="w-4 h-4" aria-hidden="true" />
                {speakerFilter ? (
                  <span className="max-w-[100px] truncate">
                    {transcript.speakerNames[speakerFilter] || speakerFilter}
                  </span>
                ) : (
                  'All Speakers'
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>Filter by Speaker</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuCheckboxItem
                checked={!speakerFilter}
                onCheckedChange={() => setSpeakerFilter(null)}
              >
                All Speakers
              </DropdownMenuCheckboxItem>
              <DropdownMenuSeparator />
              {speakers.map((speaker) => (
                <DropdownMenuCheckboxItem
                  key={speaker.id}
                  checked={speakerFilter === speaker.id}
                  onCheckedChange={() => setSpeakerFilter(speaker.id)}
                >
                  <div className="flex items-center gap-2 w-full">
                    <span
                      className={cn(
                        'w-2 h-2 rounded-full',
                        getSpeakerColor(speaker.colorIndex).bgSolid
                      )}
                    />
                    <span className="flex-1 truncate">
                      {speaker.name || formatSpeakerId(speaker.id)}
                    </span>
                    <Badge variant="secondary" className="text-[10px] px-1.5">
                      {speaker.segmentCount}
                    </Badge>
                  </div>
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active Filters */}
        {hasFilters && (
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Filters:</span>
            {speakerFilter && (
              <Badge variant="secondary" className="gap-1">
                Speaker: {transcript.speakerNames[speakerFilter] || formatSpeakerId(speakerFilter)}
                <button
                  className="ml-1 hover:text-foreground"
                  onClick={() => setSpeakerFilter(null)}
                  aria-label={`Remove speaker filter: ${transcript.speakerNames[speakerFilter] || formatSpeakerId(speakerFilter)}`}
                >
                  ×
                </button>
              </Badge>
            )}
            {searchQuery && (
              <Badge variant="secondary" className="gap-1">
                Search: "{searchQuery}"
                <button
                  className="ml-1 hover:text-foreground"
                  onClick={() => {
                    setSearchQuery('');
                    setLocalSearch('');
                  }}
                  aria-label={`Remove search filter: ${searchQuery}`}
                >
                  ×
                </button>
              </Badge>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={handleClearFilters}
            >
              Clear all
            </Button>
          </div>
        )}
      </div>

      {/* Two-column layout */}
      <div className="flex flex-1 min-h-0">
        {/* Speaker Sidebar with Action Items */}
        <div className="w-64 border-r border-border flex flex-col">
          {/* Speakers Section */}
          <div className="p-3 space-y-2 border-b border-border">
            <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Speakers
            </div>
            {speakers.map((speaker) => (
              <button
                key={speaker.id}
                className={cn(
                  'w-full text-left p-2 rounded-lg transition-colors',
                  speakerFilter === speaker.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                )}
                onClick={() =>
                  setSpeakerFilter(speakerFilter === speaker.id ? null : speaker.id)
                }
              >
                <SpeakerBadge
                  speaker={speaker.id}
                  speakerName={speaker.name}
                  colorIndex={speaker.colorIndex}
                  size="sm"
                  asSpan
                />
                <div className="mt-1 text-xs text-muted-foreground">
                  {speaker.segmentCount} segments
                </div>
              </button>
            ))}
          </div>

          {/* Action Items Panel */}
          <div className="flex-1 overflow-auto p-3">
            <ActionItemsPanel transcript={transcript.text} />
          </div>
        </div>

        {/* Transcript Content */}
        <ScrollArea className="flex-1">
          <div className="p-6 pl-20">
            {filteredSegments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {hasFilters
                  ? 'No segments match your filters'
                  : 'No transcript segments'}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredSegments.map((segment) => (
                  <SpeakerSegment
                    key={segment.id}
                    segment={segment}
                    speakerName={transcript.speakerNames[segment.speaker]}
                    colorIndex={transcript.speakerColors[segment.speaker] || 0}
                    searchQuery={searchQuery}
                    onRenameSpeaker={(newName) =>
                      renameSpeaker(segment.speaker, newName)
                    }
                  />
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}

function formatSpeakerId(speaker: string): string {
  const match = speaker.match(/speaker_(\d+)/i);
  if (match) {
    return `Speaker ${parseInt(match[1]) + 1}`;
  }
  return speaker;
}

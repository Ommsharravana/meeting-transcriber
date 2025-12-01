'use client';

import { useState } from 'react';
import { History, FileText, Trash2, ChevronLeft, ChevronRight, Clock, Users, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import { Transcript } from '@/types/transcription';
import { formatDuration } from '@/lib/utils/time';
import { toast } from 'sonner';

interface HistorySidebarProps {
  history: Transcript[];
  isLoading: boolean;
  onSelect: (transcript: Transcript) => void;
  onDelete: (id: string) => Promise<void>;
  onClearAll: () => Promise<void>;
  currentTranscriptId?: string;
}

export function HistorySidebar({
  history,
  isLoading,
  onSelect,
  onDelete,
  onClearAll,
  currentTranscriptId,
}: HistorySidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setDeletingId(id);
      await onDelete(id);
      toast.success('Transcript deleted');
    } catch (error) {
      toast.error('Failed to delete transcript');
    } finally {
      setDeletingId(null);
    }
  };

  const handleClearAll = async () => {
    try {
      await onClearAll();
      toast.success('All transcripts cleared');
    } catch (error) {
      toast.error('Failed to clear history');
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return d.toLocaleDateString(undefined, { weekday: 'short' });
    } else {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-12 border-r border-border bg-card/50 flex flex-col items-center py-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(false)}
          className="mb-4"
          title="Expand history"
          aria-label="Expand history sidebar"
        >
          <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </Button>
        <div className="flex flex-col items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <span className="text-xs text-muted-foreground rotate-90 whitespace-nowrap mt-2">
            {history.length} items
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 border-r border-border bg-card/50 flex flex-col">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-primary" />
          <span className="font-medium text-sm">History</span>
          <span className="text-xs text-muted-foreground">({history.length})</span>
        </div>
        <div className="flex items-center gap-1">
          {history.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Clear all" aria-label="Clear all history">
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Clear all history?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete all {history.length} saved transcripts. This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                    Clear All
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsCollapsed(true)}
            className="h-7 w-7"
            title="Collapse"
            aria-label="Collapse history sidebar"
          >
            <ChevronLeft className="w-4 h-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* History List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground text-sm">
              Loading...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No transcripts yet</p>
              <p className="text-xs mt-1">Transcripts will appear here</p>
            </div>
          ) : (
            history.map((transcript) => (
              <div
                key={transcript.id}
                onClick={() => onSelect(transcript)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSelect(transcript)}
                className={cn(
                  'w-full text-left p-2.5 rounded-lg transition-colors group relative cursor-pointer',
                  currentTranscriptId === transcript.id
                    ? 'bg-primary/10 border border-primary/20'
                    : 'hover:bg-muted/50'
                )}
              >
                {/* Delete button - appears on hover */}
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'absolute right-1 top-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity',
                    deletingId === transcript.id && 'opacity-100'
                  )}
                  onClick={(e) => handleDelete(transcript.id, e)}
                  disabled={deletingId === transcript.id}
                  title="Delete"
                  aria-label={`Delete transcript: ${transcript.fileName}`}
                >
                  <Trash2 className="w-3 h-3 text-muted-foreground hover:text-destructive" aria-hidden="true" />
                </Button>

                {/* Content */}
                <div className="pr-6">
                  <p className="text-sm font-medium truncate">
                    {transcript.fileName.replace(/\.[^/.]+$/, '')}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(transcript.duration)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" />
                      {Object.keys(transcript.speakerColors).length}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground/70 mt-1">
                    {formatDate(transcript.createdAt)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

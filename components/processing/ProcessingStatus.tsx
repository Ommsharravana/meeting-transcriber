'use client';

import { Loader2, Upload, Scissors, AudioLines, Merge, CheckCircle, XCircle, Sparkles, Users, Layers } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ProcessingStatus as Status } from '@/types/transcription';
import { useTranscriptionStore } from '@/store/transcriptionStore';

const STATUS_CONFIG: Record<Status, {
  icon: typeof Loader2;
  label: string;
  description: string;
  color: string;
}> = {
  idle: {
    icon: AudioLines,
    label: 'Ready',
    description: 'Upload a file or start recording',
    color: 'text-muted-foreground',
  },
  uploading: {
    icon: Upload,
    label: 'Uploading',
    description: 'Sending file to OpenAI...',
    color: 'text-primary',
  },
  chunking: {
    icon: Scissors,
    label: 'Chunking',
    description: 'Splitting large file into chunks...',
    color: 'text-amber-400',
  },
  transcribing: {
    icon: AudioLines,
    label: 'Transcribing',
    description: 'Converting speech to text...',
    color: 'text-primary',
  },
  merging: {
    icon: Merge,
    label: 'Merging',
    description: 'Combining transcripts...',
    color: 'text-purple-400',
  },
  complete: {
    icon: CheckCircle,
    label: 'Complete',
    description: 'Transcription finished!',
    color: 'text-emerald-400',
  },
  error: {
    icon: XCircle,
    label: 'Error',
    description: 'Something went wrong',
    color: 'text-destructive',
  },
};

export function ProcessingStatus() {
  const { status, progress, chunkProgress, error } = useTranscriptionStore();

  if (status === 'idle') return null;

  const config = STATUS_CONFIG[status];
  const Icon = config.icon;
  const isAnimated = ['uploading', 'chunking', 'transcribing', 'merging'].includes(status);

  return (
    <div className="p-6 rounded-2xl border border-border bg-card" role="status" aria-live="polite" aria-atomic="true">
      <div className="flex items-center gap-4">
        <div
          className={cn(
            'w-12 h-12 rounded-xl flex items-center justify-center',
            status === 'error' ? 'bg-destructive/10' : 'bg-primary/10',
            isAnimated && 'processing-gradient'
          )}
        >
          <Icon
            className={cn(
              'w-6 h-6',
              config.color,
              isAnimated && 'animate-pulse'
            )}
            aria-hidden="true"
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={cn('font-semibold', config.color)}>
              {config.label}
            </span>
            {chunkProgress && (
              <span className="text-sm text-muted-foreground">
                ({chunkProgress.currentChunk}/{chunkProgress.totalChunks} chunks)
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            {status === 'error' && error ? error.message : config.description}
          </p>
        </div>

        {isAnimated && (
          <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" aria-hidden="true" />
        )}
      </div>

      {progress > 0 && status !== 'complete' && status !== 'error' && (
        <div className="mt-4 space-y-2">
          <Progress value={progress} className="h-2" aria-label={`Progress: ${Math.round(progress)}%`} />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span aria-live="polite">{Math.round(progress)}%</span>
          </div>
        </div>
      )}

      {chunkProgress && chunkProgress.totalChunks > 1 && (
        <div className="mt-4 space-y-2">
          <div className="flex gap-1">
            {Array.from({ length: chunkProgress.totalChunks }, (_, idx) => {
              const isComplete = idx < chunkProgress.currentChunk;
              const isProcessing = idx === chunkProgress.currentChunk - 1 && chunkProgress.phase === 'transcribing';
              return (
                <div
                  key={idx}
                  className={cn(
                    'flex-1 h-2 rounded-full transition-colors',
                    isComplete && 'bg-emerald-500',
                    isProcessing && 'bg-primary animate-pulse',
                    !isComplete && !isProcessing && 'bg-muted'
                  )}
                />
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {chunkProgress.message}
          </p>
        </div>
      )}

      {/* Dual Model Progress Indicator */}
      {chunkProgress && (chunkProgress.phase === 'quality' || chunkProgress.phase === 'diarization' || chunkProgress.phase === 'merging') && (
        <div className="mt-4 space-y-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium">Dual Model Processing</span>
            <Badge variant="outline" className="text-[10px]">Best Quality + Speaker ID</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div className={cn(
              'p-2 rounded-lg border text-center transition-all',
              chunkProgress.phase === 'quality' ? 'border-primary bg-primary/10' :
              (chunkProgress.phase === 'diarization' || chunkProgress.phase === 'merging') ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-muted bg-muted/50'
            )}>
              <Sparkles className={cn(
                'w-4 h-4 mx-auto mb-1',
                chunkProgress.phase === 'quality' ? 'text-primary animate-pulse' :
                (chunkProgress.phase === 'diarization' || chunkProgress.phase === 'merging') ? 'text-emerald-500' : 'text-muted-foreground'
              )} />
              <p className="text-[10px] font-medium">Quality Text</p>
              <p className="text-[8px] text-muted-foreground">GPT-4o Transcribe</p>
            </div>
            <div className={cn(
              'p-2 rounded-lg border text-center transition-all',
              chunkProgress.phase === 'diarization' ? 'border-primary bg-primary/10' :
              chunkProgress.phase === 'merging' ? 'border-emerald-500/50 bg-emerald-500/10' : 'border-muted bg-muted/50'
            )}>
              <Users className={cn(
                'w-4 h-4 mx-auto mb-1',
                chunkProgress.phase === 'diarization' ? 'text-primary animate-pulse' :
                chunkProgress.phase === 'merging' ? 'text-emerald-500' : 'text-muted-foreground'
              )} />
              <p className="text-[10px] font-medium">Speaker ID</p>
              <p className="text-[8px] text-muted-foreground">GPT-4o Diarize</p>
            </div>
            <div className={cn(
              'p-2 rounded-lg border text-center transition-all',
              chunkProgress.phase === 'merging' ? 'border-primary bg-primary/10' : 'border-muted bg-muted/50'
            )}>
              <Merge className={cn(
                'w-4 h-4 mx-auto mb-1',
                chunkProgress.phase === 'merging' ? 'text-primary animate-pulse' : 'text-muted-foreground'
              )} />
              <p className="text-[10px] font-medium">Merge</p>
              <p className="text-[8px] text-muted-foreground">Combine Results</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            {chunkProgress.message}
          </p>
        </div>
      )}
    </div>
  );
}

'use client';

import { useState, useCallback } from 'react';
import { Mic, MicOff, Square, Pause, Play, Trash2, Upload, AlertCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { useRecording } from '@/hooks/useRecording';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { useTranscription } from '@/hooks/useTranscription';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Simple waveform visualization component
function WaveformVisualization({ audioLevel, isRecording }: { audioLevel: number; isRecording: boolean }) {
  // Create 12 bars for visualization
  const bars = Array.from({ length: 12 }, (_, i) => {
    // Each bar has a threshold based on its position
    const threshold = (i + 1) * 8; // 8, 16, 24, ... 96
    const isActive = audioLevel > threshold;

    // Create a wave effect using sine
    const baseHeight = isRecording && isActive ? 20 + (audioLevel / 100) * 60 : 10;
    const waveOffset = Math.sin((Date.now() / 200) + i * 0.5) * 10;
    const height = Math.max(10, baseHeight + (isRecording ? waveOffset : 0));

    return (
      <div
        key={i}
        className={cn(
          'w-1.5 rounded-full transition-all duration-75',
          isRecording && isActive ? 'bg-primary' : 'bg-muted-foreground/30'
        )}
        style={{ height: `${height}%` }}
      />
    );
  });

  return (
    <div className="flex items-center justify-center gap-1 h-20">
      {bars}
    </div>
  );
}

export function AudioRecorder() {
  const {
    state,
    duration,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  } = useRecording();

  const { setFile, status: transcriptionStatus } = useTranscriptionStore();
  const { startTranscription } = useTranscription();
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedDuration, setRecordedDuration] = useState(0);

  const isIdle = state === 'idle' || state === 'stopped';
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isRequesting = state === 'requesting';
  const hasRecording = recordedBlob !== null;
  const isProcessing = transcriptionStatus !== 'idle' && transcriptionStatus !== 'complete' && transcriptionStatus !== 'error';

  const handleStart = useCallback(async () => {
    setRecordedBlob(null);
    setRecordedDuration(0);
    await startRecording();
  }, [startRecording]);

  const handleStop = useCallback(async () => {
    const result = await stopRecording();
    if (result) {
      setRecordedBlob(result.blob);
      setRecordedDuration(result.duration);
    }
  }, [stopRecording]);

  const handleCancel = useCallback(() => {
    cancelRecording();
    setRecordedBlob(null);
    setRecordedDuration(0);
  }, [cancelRecording]);

  const handleTranscribe = useCallback(async () => {
    if (!recordedBlob) return;

    // Convert blob to File for the transcription pipeline
    const fileName = `recording-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.webm`;
    const file = new File([recordedBlob], fileName, { type: recordedBlob.type });

    // Set the file in the store
    setFile(file);

    // Start transcription
    await startTranscription();

    // Clear recording state
    setRecordedBlob(null);
    setRecordedDuration(0);
  }, [recordedBlob, setFile, startTranscription]);

  const handleDiscard = useCallback(() => {
    setRecordedBlob(null);
    setRecordedDuration(0);
  }, []);

  return (
    <div className="space-y-4">
      <Card className={cn(
        'border-2 transition-all duration-200',
        isRecording && 'border-red-500/50 bg-red-500/5',
        isPaused && 'border-amber-500/50 bg-amber-500/5',
        hasRecording && !isRecording && !isPaused && 'border-primary/50 bg-primary/5'
      )}>
        <CardContent className="p-6">
          {/* Waveform Visualization */}
          <div className="mb-6">
            <WaveformVisualization audioLevel={audioLevel} isRecording={isRecording} />
          </div>

          {/* Timer Display */}
          <div className="text-center mb-6">
            <div className={cn(
              'text-5xl font-mono font-bold tracking-wider',
              isRecording && 'text-red-400 animate-pulse',
              isPaused && 'text-amber-400',
              hasRecording && !isRecording && !isPaused && 'text-primary'
            )}>
              {hasRecording && !isRecording && !isPaused
                ? formatTime(recordedDuration)
                : formatTime(duration)
              }
            </div>
            <div className="text-sm text-muted-foreground mt-2">
              {isRequesting && 'Requesting microphone access...'}
              {isRecording && 'Recording...'}
              {isPaused && 'Paused'}
              {hasRecording && !isRecording && !isPaused && 'Recording complete'}
              {isIdle && !hasRecording && 'Ready to record'}
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            {/* Recording controls */}
            {isIdle && !hasRecording && (
              <Button
                size="lg"
                onClick={handleStart}
                disabled={isRequesting}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
                aria-label="Start recording"
              >
                {isRequesting ? (
                  <Loader2 className="w-8 h-8 animate-spin" aria-hidden="true" />
                ) : (
                  <Mic className="w-8 h-8" aria-hidden="true" />
                )}
              </Button>
            )}

            {(isRecording || isPaused) && (
              <>
                {/* Pause/Resume */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={isPaused ? resumeRecording : pauseRecording}
                  className="h-14 w-14 rounded-full"
                  aria-label={isPaused ? 'Resume recording' : 'Pause recording'}
                >
                  {isPaused ? (
                    <Play className="w-6 h-6" aria-hidden="true" />
                  ) : (
                    <Pause className="w-6 h-6" aria-hidden="true" />
                  )}
                </Button>

                {/* Stop */}
                <Button
                  size="lg"
                  onClick={handleStop}
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
                  aria-label="Stop recording"
                >
                  <Square className="w-6 h-6" aria-hidden="true" />
                </Button>

                {/* Cancel */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleCancel}
                  className="h-14 w-14 rounded-full"
                  aria-label="Cancel recording"
                >
                  <Trash2 className="w-6 h-6" aria-hidden="true" />
                </Button>
              </>
            )}

            {/* Post-recording controls */}
            {hasRecording && !isRecording && !isPaused && (
              <>
                {/* Discard */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDiscard}
                  disabled={isProcessing}
                  className="h-14 w-14 rounded-full"
                  aria-label="Discard recording"
                >
                  <Trash2 className="w-6 h-6" aria-hidden="true" />
                </Button>

                {/* Record again */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleStart}
                  disabled={isProcessing}
                  className="h-14 w-14 rounded-full"
                  aria-label="Record again"
                >
                  <Mic className="w-6 h-6" aria-hidden="true" />
                </Button>

                {/* Transcribe */}
                <Button
                  size="lg"
                  onClick={handleTranscribe}
                  disabled={isProcessing}
                  className="h-16 px-8 rounded-full gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  aria-label="Transcribe recording"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="w-5 h-5" aria-hidden="true" />
                      Transcribe
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0" aria-hidden="true" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tips */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>Tip: Speak clearly and at a consistent volume for best results</p>
        <p>Recordings are processed locally - your audio is never stored on our servers</p>
      </div>
    </div>
  );
}

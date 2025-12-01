'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Mic, MicOff, Square, Pause, Play, Trash2, Upload, AlertCircle, Loader2, Radio, Wifi, WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useRealtimeRecording, RealtimeRecordingResult } from '@/hooks/useRealtimeRecording';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { RealtimeProvider, Transcript } from '@/types/transcription';
import { assignSpeakerColors } from '@/lib/utils/colors';
import { toast } from 'sonner';

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Waveform visualization
function WaveformVisualization({ audioLevel, isRecording }: { audioLevel: number; isRecording: boolean }) {
  const bars = Array.from({ length: 12 }, (_, i) => {
    const threshold = (i + 1) * 8;
    const isActive = audioLevel > threshold;
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
    <div className="flex items-center justify-center gap-1 h-16">
      {bars}
    </div>
  );
}

// Live transcript display
function LiveTranscriptDisplay({ finalText, partialText }: { finalText: string; partialText: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [finalText, partialText]);

  if (!finalText && !partialText) {
    return (
      <div className="text-center text-muted-foreground py-4 text-sm">
        Start speaking to see live transcription...
      </div>
    );
  }

  return (
    <ScrollArea className="h-32 w-full rounded-md border p-3" ref={scrollRef}>
      <div className="text-sm leading-relaxed">
        {finalText && <span className="text-foreground">{finalText}</span>}
        {partialText && (
          <span className="text-muted-foreground/70 italic">
            {finalText ? ' ' : ''}{partialText}
          </span>
        )}
      </div>
    </ScrollArea>
  );
}

interface RealtimeAudioRecorderProps {
  apiKey: string;
  provider: RealtimeProvider;
  language?: string;
}

export function RealtimeAudioRecorder({ apiKey, provider, language }: RealtimeAudioRecorderProps) {
  const {
    state,
    duration,
    error,
    audioLevel,
    transcript,
    isConnected,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  } = useRealtimeRecording({ apiKey, provider, language });

  const { setTranscript } = useTranscriptionStore();
  const [recordedResult, setRecordedResult] = useState<RealtimeRecordingResult | null>(null);

  const isIdle = state === 'idle' || state === 'stopped';
  const isRecording = state === 'recording';
  const isPaused = state === 'paused';
  const isRequesting = state === 'requesting';
  const isConnecting = state === 'connecting';
  const hasRecording = recordedResult !== null;

  const handleStart = useCallback(async () => {
    setRecordedResult(null);
    await startRecording();
  }, [startRecording]);

  const handleStop = useCallback(async () => {
    const result = await stopRecording();
    if (result) {
      setRecordedResult(result);
    }
  }, [stopRecording]);

  const handleCancel = useCallback(() => {
    cancelRecording();
    setRecordedResult(null);
  }, [cancelRecording]);

  const handleSaveTranscript = useCallback(() => {
    if (!recordedResult || !recordedResult.transcript.finalText) {
      toast.error('No transcript to save');
      return;
    }

    // Create a full transcript from the realtime result
    const speakers = [...new Set(recordedResult.transcript.segments.map(s => s.speaker))];
    const speakerColors = assignSpeakerColors(speakers.length > 0 ? speakers : ['speaker_0']);

    const fullTranscript: Transcript = {
      id: crypto.randomUUID(),
      text: recordedResult.transcript.finalText,
      segments: recordedResult.transcript.segments.length > 0
        ? recordedResult.transcript.segments
        : [{
            id: 'seg-0',
            speaker: 'speaker_0',
            text: recordedResult.transcript.finalText,
            start: 0,
            end: recordedResult.duration,
          }],
      duration: recordedResult.duration,
      model: 'elevenlabs-scribe-v1',
      createdAt: new Date(),
      fileName: `realtime-recording-${new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')}.webm`,
      speakerColors,
      speakerNames: {},
    };

    setTranscript(fullTranscript);
    setRecordedResult(null);
    toast.success('Transcript saved!');
  }, [recordedResult, setTranscript]);

  const handleDiscard = useCallback(() => {
    setRecordedResult(null);
  }, []);

  return (
    <div className="space-y-4">
      <Card className={cn(
        'border-2 transition-all duration-200',
        isRecording && 'border-red-500/50 bg-red-500/5',
        isPaused && 'border-amber-500/50 bg-amber-500/5',
        isConnecting && 'border-cyan-500/50 bg-cyan-500/5',
        hasRecording && !isRecording && !isPaused && 'border-primary/50 bg-primary/5'
      )}>
        <CardContent className="p-6">
          {/* Connection Status */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'default' : 'secondary'} className="gap-1.5">
                {isConnected ? (
                  <>
                    <Wifi className="w-3 h-3" />
                    Connected
                  </>
                ) : (
                  <>
                    <WifiOff className="w-3 h-3" />
                    Disconnected
                  </>
                )}
              </Badge>
              {isRecording && (
                <Badge variant="destructive" className="gap-1.5 animate-pulse">
                  <Radio className="w-3 h-3" />
                  Live
                </Badge>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              ElevenLabs Realtime
            </Badge>
          </div>

          {/* Waveform Visualization */}
          <div className="mb-4">
            <WaveformVisualization audioLevel={audioLevel} isRecording={isRecording} />
          </div>

          {/* Timer Display */}
          <div className="text-center mb-4">
            <div className={cn(
              'text-4xl font-mono font-bold tracking-wider',
              isRecording && 'text-red-400 animate-pulse',
              isPaused && 'text-amber-400',
              isConnecting && 'text-cyan-400',
              hasRecording && !isRecording && !isPaused && 'text-primary'
            )}>
              {hasRecording && !isRecording && !isPaused
                ? formatTime(recordedResult?.duration || 0)
                : formatTime(duration)
              }
            </div>
            <div className="text-sm text-muted-foreground mt-1">
              {isRequesting && 'Requesting microphone access...'}
              {isConnecting && 'Connecting to ElevenLabs...'}
              {isRecording && 'Recording with live transcription...'}
              {isPaused && 'Paused'}
              {hasRecording && !isRecording && !isPaused && 'Recording complete'}
              {isIdle && !hasRecording && 'Ready for realtime transcription'}
            </div>
          </div>

          {/* Live Transcript Display */}
          {(isRecording || isPaused || hasRecording) && (
            <div className="mb-4">
              <div className="text-xs text-muted-foreground mb-2 font-medium">Live Transcript</div>
              <LiveTranscriptDisplay
                finalText={hasRecording ? recordedResult?.transcript.finalText || '' : transcript.finalText}
                partialText={hasRecording ? '' : transcript.partialText}
              />
            </div>
          )}

          {/* Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            {/* Start Recording */}
            {isIdle && !hasRecording && (
              <Button
                size="lg"
                onClick={handleStart}
                disabled={isRequesting || isConnecting || !apiKey}
                className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
                aria-label="Start realtime recording"
              >
                {isRequesting || isConnecting ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <Mic className="w-8 h-8" />
                )}
              </Button>
            )}

            {/* Recording Controls */}
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
                  {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                </Button>

                {/* Stop */}
                <Button
                  size="lg"
                  onClick={handleStop}
                  className="h-16 w-16 rounded-full bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/25"
                  aria-label="Stop recording"
                >
                  <Square className="w-6 h-6" />
                </Button>

                {/* Cancel */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleCancel}
                  className="h-14 w-14 rounded-full"
                  aria-label="Cancel recording"
                >
                  <Trash2 className="w-6 h-6" />
                </Button>
              </>
            )}

            {/* Post-recording Controls */}
            {hasRecording && !isRecording && !isPaused && (
              <>
                {/* Discard */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleDiscard}
                  className="h-14 w-14 rounded-full"
                  aria-label="Discard recording"
                >
                  <Trash2 className="w-6 h-6" />
                </Button>

                {/* Record Again */}
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleStart}
                  className="h-14 w-14 rounded-full"
                  aria-label="Record again"
                >
                  <Mic className="w-6 h-6" />
                </Button>

                {/* Save Transcript */}
                <Button
                  size="lg"
                  onClick={handleSaveTranscript}
                  disabled={!recordedResult?.transcript.finalText}
                  className="h-16 px-8 rounded-full gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25"
                  aria-label="Save transcript"
                >
                  <Upload className="w-5 h-5" />
                  Save Transcript
                </Button>
              </>
            )}
          </div>

          {/* No API Key Warning */}
          {!apiKey && (
            <div className="mt-4 text-center text-sm text-amber-500">
              Please add your ElevenLabs API key in settings to use realtime transcription.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive" role="alert">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Tips */}
      <div className="text-center text-xs text-muted-foreground space-y-1">
        <p>ElevenLabs Realtime Scribe provides live transcription as you speak</p>
        <p>Supports 99 languages with automatic language detection</p>
      </div>
    </div>
  );
}

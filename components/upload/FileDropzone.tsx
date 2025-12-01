'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileAudio, AlertCircle, X, Play, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { SUPPORTED_EXTENSIONS, SUPPORTED_FORMATS, MAX_UPLOADABLE_SIZE } from '@/lib/openai/models';
import { formatFileSize } from '@/lib/utils/time';
import { useTranscriptionStore } from '@/store/transcriptionStore';
import { useTranscription } from '@/hooks/useTranscription';

export function FileDropzone() {
  const { file, setFile, status } = useTranscriptionStore();
  const { startTranscription } = useTranscription();
  const [error, setError] = useState<string | null>(null);
  const isProcessing = status !== 'idle' && status !== 'complete' && status !== 'error';

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);

    if (rejectedFiles.length > 0) {
      const rejection = rejectedFiles[0];
      if (rejection.errors[0]?.code === 'file-too-large') {
        setError(`File too large. Maximum size is ${formatFileSize(MAX_UPLOADABLE_SIZE)}`);
      } else if (rejection.errors[0]?.code === 'file-invalid-type') {
        setError('Unsupported file format. Please use MP3, MP4, WAV, WEBM, or M4A');
      } else {
        setError('Invalid file. Please try again.');
      }
      return;
    }

    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, [setFile]);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: SUPPORTED_FORMATS.reduce((acc, format) => {
      acc[format] = SUPPORTED_EXTENSIONS;
      return acc;
    }, {} as Record<string, string[]>),
    maxSize: MAX_UPLOADABLE_SIZE,
    multiple: false,
    disabled: status !== 'idle',
  });

  const clearFile = () => {
    setFile(null);
    setError(null);
  };

  if (file) {
    return (
      <div className="relative p-6 rounded-2xl border-2 border-primary/30 bg-primary/5 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
            <FileAudio className="w-7 h-7 text-primary" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{file.name}</p>
            <p className="text-xs text-muted-foreground">
              {formatFileSize(file.size)}
              {file.size > 25 * 1024 * 1024 && (
                <span className="ml-2 text-amber-400">
                  (Will be chunked for processing)
                </span>
              )}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={clearFile}
            disabled={isProcessing}
            className="shrink-0"
            aria-label="Remove selected file"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </Button>
        </div>

        <Button
          onClick={startTranscription}
          disabled={isProcessing}
          className="w-full h-12 text-base font-semibold gap-2"
          size="lg"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
              Processing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" aria-hidden="true" />
              Start Transcription
            </>
          )}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={cn(
          'relative p-8 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer group',
          'hover:border-primary/50 hover:bg-primary/5',
          isDragActive && !isDragReject && 'border-primary bg-primary/10 scale-[1.02]',
          isDragReject && 'border-destructive bg-destructive/10',
          error && 'border-destructive/50',
          status !== 'idle' && 'opacity-50 cursor-not-allowed'
        )}
      >
        <input {...getInputProps()} />

        <div className="flex flex-col items-center justify-center gap-4 text-center">
          <div
            className={cn(
              'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-200',
              'bg-muted/50 group-hover:bg-primary/10',
              isDragActive && 'bg-primary/20 scale-110',
              isDragReject && 'bg-destructive/20'
            )}
          >
            {isDragReject ? (
              <AlertCircle className="w-8 h-8 text-destructive" aria-hidden="true" />
            ) : (
              <Upload
                className={cn(
                  'w-8 h-8 transition-colors',
                  isDragActive ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'
                )}
                aria-hidden="true"
              />
            )}
          </div>

          <div>
            <p className="text-base font-medium">
              {isDragActive
                ? isDragReject
                  ? 'Unsupported file type'
                  : 'Drop to upload'
                : 'Drop audio or video file here'}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              or click to browse
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-1 rounded-md bg-muted/50 font-mono">MP3</span>
            <span className="px-2 py-1 rounded-md bg-muted/50 font-mono">MP4</span>
            <span className="px-2 py-1 rounded-md bg-muted/50 font-mono">WAV</span>
            <span className="px-2 py-1 rounded-md bg-muted/50 font-mono">WEBM</span>
            <span className="px-2 py-1 rounded-md bg-muted/50 font-mono">M4A</span>
          </div>

          <p className="text-xs text-muted-foreground">
            Max {formatFileSize(MAX_UPLOADABLE_SIZE)} · Large files auto-chunked
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive" role="alert">
          <AlertCircle className="w-4 h-4" aria-hidden="true" />
          {error}
        </div>
      )}
    </div>
  );
}

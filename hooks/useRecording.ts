'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

export type RecordingState = 'idle' | 'requesting' | 'recording' | 'paused' | 'stopped';

export interface RecordingResult {
  blob: Blob;
  duration: number;
  mimeType: string;
}

export interface UseRecordingReturn {
  state: RecordingState;
  duration: number;
  error: string | null;
  audioLevel: number;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RecordingResult | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
}

export function useRecording(): UseRecordingReturn {
  const [state, setState] = useState<RecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Get best supported MIME type
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }

    return 'audio/webm';
  };

  // Update timer
  const updateTimer = useCallback(() => {
    if (state === 'recording' && startTimeRef.current > 0) {
      const elapsed = Date.now() - startTimeRef.current + pausedDurationRef.current;
      setDuration(Math.floor(elapsed / 1000));
    }
  }, [state]);

  // Start timer interval
  useEffect(() => {
    if (state === 'recording') {
      timerRef.current = setInterval(updateTimer, 100);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [state, updateTimer]);

  // Audio level analyzer
  const startAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      source.connect(analyserRef.current);

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (analyserRef.current && state === 'recording') {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(Math.min(100, (average / 128) * 100));
          animationFrameRef.current = requestAnimationFrame(updateLevel);
        }
      };

      updateLevel();
    } catch (err) {
      console.warn('Audio level monitoring not available:', err);
    }
  }, [state]);

  // Stop audio level monitoring
  const stopAudioLevelMonitoring = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopAudioLevelMonitoring();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [stopAudioLevelMonitoring]);

  const startRecording = useCallback(async () => {
    setError(null);
    setState('requesting');
    chunksRef.current = [];
    setDuration(0);
    pausedDurationRef.current = 0;

    try {
      // Check if MediaRecorder is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      streamRef.current = stream;

      const mimeType = getSupportedMimeType();
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType,
        audioBitsPerSecond: 128000,
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (event: any) => {
        console.error('MediaRecorder error:', event);
        setError('Recording error occurred');
        setState('idle');
      };

      // Start recording with 1-second chunks
      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      setState('recording');

      // Start audio level monitoring
      startAudioLevelMonitoring(stream);
    } catch (err: any) {
      console.error('Failed to start recording:', err);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access in your browser settings.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone and try again.');
      } else if (err.name === 'NotReadableError') {
        setError('Microphone is already in use by another application.');
      } else {
        setError(err.message || 'Failed to start recording');
      }

      setState('idle');
    }
  }, [startAudioLevelMonitoring]);

  const stopRecording = useCallback(async (): Promise<RecordingResult | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      const stream = streamRef.current;

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const finalDuration = duration;

      mediaRecorder.onstop = () => {
        // Stop all tracks
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        streamRef.current = null;
        mediaRecorderRef.current = null;

        // Stop audio level monitoring
        stopAudioLevelMonitoring();

        // Create blob from chunks
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        setState('stopped');

        resolve({
          blob,
          duration: finalDuration,
          mimeType,
        });
      };

      mediaRecorder.stop();
    });
  }, [duration, stopAudioLevelMonitoring]);

  const pauseRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.pause();
      pausedDurationRef.current = Date.now() - startTimeRef.current + pausedDurationRef.current;
      setState('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;

    if (mediaRecorder && mediaRecorder.state === 'paused') {
      mediaRecorder.resume();
      startTimeRef.current = Date.now();
      setState('recording');
    }
  }, []);

  const cancelRecording = useCallback(() => {
    const mediaRecorder = mediaRecorderRef.current;
    const stream = streamRef.current;

    // Stop media recorder
    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    // Stop all tracks
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    // Stop audio level monitoring
    stopAudioLevelMonitoring();

    // Reset state
    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setDuration(0);
    pausedDurationRef.current = 0;
    setError(null);
    setState('idle');
  }, [stopAudioLevelMonitoring]);

  return {
    state,
    duration,
    error,
    audioLevel,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}

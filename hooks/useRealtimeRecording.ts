'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useElevenLabsRealtime } from './useElevenLabsRealtime';
import { RealtimeProvider, RealtimeTranscript, TranscriptSegment } from '@/types/transcription';
import { assignSpeakerColors } from '@/lib/utils/colors';

export type RealtimeRecordingState = 'idle' | 'requesting' | 'connecting' | 'recording' | 'paused' | 'stopped';

export interface UseRealtimeRecordingOptions {
  apiKey: string;
  provider: RealtimeProvider;
  language?: string;
}

export interface UseRealtimeRecordingReturn {
  state: RealtimeRecordingState;
  duration: number;
  error: string | null;
  audioLevel: number;
  transcript: RealtimeTranscript;
  isConnected: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<RealtimeRecordingResult | null>;
  pauseRecording: () => void;
  resumeRecording: () => void;
  cancelRecording: () => void;
}

export interface RealtimeRecordingResult {
  blob: Blob;
  duration: number;
  mimeType: string;
  transcript: RealtimeTranscript;
}

export function useRealtimeRecording(options: UseRealtimeRecordingOptions): UseRealtimeRecordingReturn {
  const { apiKey, provider, language } = options;

  const [state, setState] = useState<RealtimeRecordingState>('idle');
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevel, setAudioLevel] = useState(0);

  // Refs for recording
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);
  const pausedDurationRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  // ElevenLabs Realtime hook
  const elevenLabs = useElevenLabsRealtime({
    apiKey: provider === 'elevenlabs' ? apiKey : '',
    config: {
      model_id: 'scribe_v1',
      language_code: language,
      sample_rate: 16000,
      encoding: 'pcm_s16le',
      endpointing: 200, // 200ms silence threshold for VAD
    },
    onError: (err) => {
      console.error('[Realtime Recording] ElevenLabs error:', err);
      setError(err);
    },
  });

  // Get best supported MIME type
  const getSupportedMimeType = (): string => {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/ogg;codecs=opus',
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

  // Timer effect
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
  const setupAudioAnalyzer = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      const source = audioContextRef.current.createMediaStreamSource(stream);

      // Create analyzer for visualization
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

      // Create script processor for sending raw audio to ElevenLabs
      if (provider === 'elevenlabs') {
        // Use AudioWorklet if available, otherwise fall back to ScriptProcessor
        const bufferSize = 4096;
        scriptProcessorRef.current = audioContextRef.current.createScriptProcessor(bufferSize, 1, 1);

        scriptProcessorRef.current.onaudioprocess = (event) => {
          if (state === 'recording' && elevenLabs.isConnected) {
            const inputData = event.inputBuffer.getChannelData(0);
            // Send audio data to ElevenLabs
            elevenLabs.sendAudio(inputData, audioContextRef.current?.sampleRate || 16000);
          }
        };

        source.connect(scriptProcessorRef.current);
        scriptProcessorRef.current.connect(audioContextRef.current.destination);
      }
    } catch (err) {
      console.warn('Audio analyzer setup failed:', err);
    }
  }, [state, provider, elevenLabs]);

  // Cleanup audio
  const cleanupAudio = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (scriptProcessorRef.current) {
      scriptProcessorRef.current.disconnect();
      scriptProcessorRef.current = null;
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
      cleanupAudio();
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      elevenLabs.disconnect();
    };
  }, [cleanupAudio, elevenLabs]);

  const startRecording = useCallback(async () => {
    setError(null);
    setState('requesting');
    chunksRef.current = [];
    setDuration(0);
    pausedDurationRef.current = 0;

    try {
      // Check browser support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Your browser does not support audio recording');
      }

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 16000, // ElevenLabs expects 16kHz
        },
      });

      streamRef.current = stream;

      // Connect to ElevenLabs realtime if using that provider
      if (provider === 'elevenlabs') {
        setState('connecting');
        await elevenLabs.connect();

        // Wait a moment for connection to establish
        await new Promise(resolve => setTimeout(resolve, 500));

        if (!elevenLabs.isConnected) {
          throw new Error('Failed to connect to ElevenLabs Realtime API');
        }
      }

      // Set up audio analyzer and streaming
      setupAudioAnalyzer(stream);

      // Also record to blob for backup/export
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

      mediaRecorder.start(1000);
      startTimeRef.current = Date.now();
      setState('recording');

    } catch (err: any) {
      console.error('Failed to start realtime recording:', err);
      cleanupAudio();
      elevenLabs.disconnect();

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (err.name === 'NotFoundError') {
        setError('No microphone found. Please connect a microphone.');
      } else {
        setError(err.message || 'Failed to start recording');
      }

      setState('idle');
    }
  }, [provider, elevenLabs, setupAudioAnalyzer, cleanupAudio]);

  const stopRecording = useCallback(async (): Promise<RealtimeRecordingResult | null> => {
    return new Promise((resolve) => {
      const mediaRecorder = mediaRecorderRef.current;
      const stream = streamRef.current;

      // Flush any remaining audio
      if (provider === 'elevenlabs') {
        elevenLabs.flush();
      }

      if (!mediaRecorder || mediaRecorder.state === 'inactive') {
        resolve(null);
        return;
      }

      const finalDuration = duration;
      const finalTranscript = elevenLabs.transcript;

      mediaRecorder.onstop = () => {
        // Stop stream
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
        streamRef.current = null;
        mediaRecorderRef.current = null;

        // Cleanup audio
        cleanupAudio();

        // Disconnect from ElevenLabs
        elevenLabs.disconnect();

        // Create blob
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: mimeType });

        setState('stopped');

        resolve({
          blob,
          duration: finalDuration,
          mimeType,
          transcript: finalTranscript,
        });
      };

      mediaRecorder.stop();
    });
  }, [duration, provider, elevenLabs, cleanupAudio]);

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

    if (mediaRecorder && mediaRecorder.state !== 'inactive') {
      mediaRecorder.stop();
    }

    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    cleanupAudio();
    elevenLabs.disconnect();

    streamRef.current = null;
    mediaRecorderRef.current = null;
    chunksRef.current = [];
    setDuration(0);
    pausedDurationRef.current = 0;
    setError(null);
    setState('idle');
  }, [cleanupAudio, elevenLabs]);

  return {
    state,
    duration,
    error,
    audioLevel,
    transcript: elevenLabs.transcript,
    isConnected: elevenLabs.isConnected,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cancelRecording,
  };
}

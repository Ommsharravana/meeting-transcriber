'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import {
  ElevenLabsRealtimeConfig,
  ElevenLabsRealtimeIncomingMessage,
  TranscriptSegment,
  RealtimeTranscript,
} from '@/types/transcription';

const ELEVENLABS_REALTIME_URL = 'wss://api.elevenlabs.io/v1/speech-to-text/realtime';

interface UseElevenLabsRealtimeOptions {
  apiKey: string;
  config?: Partial<ElevenLabsRealtimeConfig>;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
  onSessionStart?: (sessionId: string) => void;
  onSessionEnd?: () => void;
}

interface UseElevenLabsRealtimeReturn {
  isConnected: boolean;
  isListening: boolean;
  transcript: RealtimeTranscript;
  connect: () => Promise<void>;
  disconnect: () => void;
  sendAudio: (audioData: ArrayBuffer | Float32Array, sourceSampleRate?: number) => void;
  flush: () => void;
  error: string | null;
}

// Convert Float32Array to Int16Array for PCM encoding
function float32ToInt16(float32Array: Float32Array): Int16Array {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    // Clamp to [-1, 1] range
    const s = Math.max(-1, Math.min(1, float32Array[i]));
    // Convert to 16-bit integer
    int16Array[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return int16Array;
}

// Resample audio from source sample rate to target sample rate
function resampleAudio(
  audioData: Float32Array,
  sourceSampleRate: number,
  targetSampleRate: number
): Float32Array {
  if (sourceSampleRate === targetSampleRate) {
    return audioData;
  }

  const ratio = sourceSampleRate / targetSampleRate;
  const newLength = Math.round(audioData.length / ratio);
  const result = new Float32Array(newLength);

  for (let i = 0; i < newLength; i++) {
    const srcIndex = i * ratio;
    const srcIndexFloor = Math.floor(srcIndex);
    const srcIndexCeil = Math.min(srcIndexFloor + 1, audioData.length - 1);
    const t = srcIndex - srcIndexFloor;

    // Linear interpolation
    result[i] = audioData[srcIndexFloor] * (1 - t) + audioData[srcIndexCeil] * t;
  }

  return result;
}

// Convert ArrayBuffer or Float32Array to base64
function audioToBase64(
  audioData: ArrayBuffer | Float32Array,
  sourceSampleRate: number = 48000,
  targetSampleRate: number = 16000
): string {
  let float32Data: Float32Array;

  if (audioData instanceof Float32Array) {
    float32Data = audioData;
  } else {
    // Assume ArrayBuffer contains Int16 PCM data
    const int16Data = new Int16Array(audioData);
    float32Data = new Float32Array(int16Data.length);
    for (let i = 0; i < int16Data.length; i++) {
      float32Data[i] = int16Data[i] / 0x8000;
    }
  }

  // Resample to target sample rate
  const resampledData = resampleAudio(float32Data, sourceSampleRate, targetSampleRate);

  // Convert to Int16 PCM
  const int16Data = float32ToInt16(resampledData);

  // Convert to base64
  const bytes = new Uint8Array(int16Data.buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export function useElevenLabsRealtime(
  options: UseElevenLabsRealtimeOptions
): UseElevenLabsRealtimeReturn {
  const { apiKey, config, onTranscript, onError, onSessionStart, onSessionEnd } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<RealtimeTranscript>({
    finalText: '',
    partialText: '',
    segments: [],
    isListening: false,
  });

  const wsRef = useRef<WebSocket | null>(null);
  const segmentCountRef = useRef(0);
  const sessionIdRef = useRef<string | null>(null);

  // Build WebSocket URL with query parameters
  const buildWebSocketUrl = useCallback(() => {
    const params = new URLSearchParams();
    params.set('model_id', config?.model_id || 'scribe_v1');

    if (config?.language_code) {
      params.set('language_code', config.language_code);
    }

    params.set('sample_rate', String(config?.sample_rate || 16000));
    params.set('encoding', config?.encoding || 'pcm_s16le');

    if (config?.endpointing) {
      params.set('endpointing', String(config.endpointing));
    }

    if (config?.max_segment_duration_secs) {
      params.set('max_segment_duration_secs', String(config.max_segment_duration_secs));
    }

    return `${ELEVENLABS_REALTIME_URL}?${params.toString()}`;
  }, [config]);

  // Handle incoming WebSocket messages
  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data: ElevenLabsRealtimeIncomingMessage = JSON.parse(event.data);

      switch (data.type) {
        case 'session_started':
          sessionIdRef.current = data.session_id;
          setIsListening(true);
          setTranscript(prev => ({ ...prev, isListening: true }));
          onSessionStart?.(data.session_id);
          console.log('[ElevenLabs Realtime] Session started:', data.session_id);
          break;

        case 'session_ended':
          setIsListening(false);
          setTranscript(prev => ({ ...prev, isListening: false }));
          onSessionEnd?.();
          console.log('[ElevenLabs Realtime] Session ended');
          break;

        case 'transcript':
          if (data.channel === 'final') {
            // Final transcript - add to finalText and create segment
            const newSegment: TranscriptSegment = {
              id: `seg-${segmentCountRef.current++}`,
              speaker: 'speaker_0', // ElevenLabs realtime doesn't do speaker diarization yet
              text: data.transcript,
              start: data.start,
              end: data.end,
            };

            setTranscript(prev => ({
              ...prev,
              finalText: prev.finalText + (prev.finalText ? ' ' : '') + data.transcript,
              partialText: '',
              segments: [...prev.segments, newSegment],
            }));

            onTranscript?.(data.transcript, true);
            console.log('[ElevenLabs Realtime] Final transcript:', data.transcript);
          } else {
            // Partial transcript - update partialText
            setTranscript(prev => ({
              ...prev,
              partialText: data.transcript,
            }));

            onTranscript?.(data.transcript, false);
          }
          break;

        case 'vad':
          console.log('[ElevenLabs Realtime] VAD event:', data.status);
          break;

        case 'error':
          const errorMsg = data.message || data.error || 'Unknown error';
          setError(errorMsg);
          onError?.(errorMsg);
          console.error('[ElevenLabs Realtime] Error:', errorMsg);
          break;
      }
    } catch (e) {
      console.error('[ElevenLabs Realtime] Failed to parse message:', e);
    }
  }, [onTranscript, onError, onSessionStart, onSessionEnd]);

  // Connect to WebSocket
  const connect = useCallback(async () => {
    if (!apiKey) {
      setError('API key is required');
      return;
    }

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      console.log('[ElevenLabs Realtime] Already connected');
      return;
    }

    try {
      setError(null);
      const url = buildWebSocketUrl();

      console.log('[ElevenLabs Realtime] Connecting to:', url);

      // Create WebSocket with API key in header (via subprotocol for browser compatibility)
      const ws = new WebSocket(url, ['xi-api-key', apiKey]);

      ws.onopen = () => {
        console.log('[ElevenLabs Realtime] WebSocket connected');
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = handleMessage;

      ws.onerror = (event) => {
        console.error('[ElevenLabs Realtime] WebSocket error:', event);
        setError('WebSocket connection error');
        onError?.('WebSocket connection error');
      };

      ws.onclose = (event) => {
        console.log('[ElevenLabs Realtime] WebSocket closed:', event.code, event.reason);
        setIsConnected(false);
        setIsListening(false);
        setTranscript(prev => ({ ...prev, isListening: false }));

        if (event.code !== 1000) {
          const reason = event.reason || `Connection closed with code ${event.code}`;
          setError(reason);
          onError?.(reason);
        }
      };

      wsRef.current = ws;
    } catch (e) {
      const errorMsg = e instanceof Error ? e.message : 'Failed to connect';
      setError(errorMsg);
      onError?.(errorMsg);
    }
  }, [apiKey, buildWebSocketUrl, handleMessage, onError]);

  // Disconnect from WebSocket
  const disconnect = useCallback(() => {
    if (wsRef.current) {
      // Send close message before closing
      if (wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'close' }));
      }
      wsRef.current.close(1000, 'User disconnected');
      wsRef.current = null;
    }
    setIsConnected(false);
    setIsListening(false);
    sessionIdRef.current = null;
  }, []);

  // Send audio data
  const sendAudio = useCallback((audioData: ArrayBuffer | Float32Array, sourceSampleRate: number = 48000) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      console.warn('[ElevenLabs Realtime] Cannot send audio: not connected');
      return;
    }

    const targetSampleRate = config?.sample_rate || 16000;
    const base64Audio = audioToBase64(audioData, sourceSampleRate, targetSampleRate);

    wsRef.current.send(JSON.stringify({
      type: 'audio',
      audio: base64Audio,
    }));
  }, [config?.sample_rate]);

  // Flush any pending audio
  const flush = useCallback(() => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return;
    }

    wsRef.current.send(JSON.stringify({ type: 'flush' }));
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    isListening,
    transcript,
    connect,
    disconnect,
    sendAudio,
    flush,
    error,
  };
}

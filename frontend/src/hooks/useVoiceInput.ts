import { useState, useCallback, useRef } from 'react';
import { Capacitor } from '@capacitor/core';
import { api } from '../api/client';

/**
 * Platform-aware voice input hook.
 * - iOS native: uses WhisperPlugin (on-device whisper.cpp)
 * - Web/PWA: uses MediaRecorder -> Oracle VM transcription server
 */

export interface UseVoiceInputReturn {
  isListening: boolean;
  transcript: string | null;
  error: string | null;
  isSupported: boolean;
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  reset: () => void;
}

export function useVoiceInput(): UseVoiceInputReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const isNative = Capacitor.isNativePlatform();

  // Web uses MediaRecorder, which needs network for transcription
  // iOS native uses on-device whisper.cpp
  const isSupported = isNative || (typeof MediaRecorder !== 'undefined');

  const startListeningNative = useCallback(async () => {
    try {
      const { default: Whisper } = await import('../plugins/whisper');
      const perm = await Whisper.checkPermission();
      if (perm.status === 'denied') {
        setError('Microphone permission denied');
        return;
      }
      if (perm.status === 'prompt') {
        const result = await Whisper.requestPermission();
        if (result.status === 'denied') {
          setError('Microphone permission denied');
          return;
        }
      }
      setIsListening(true);
      setError(null);
      setTranscript(null);
      await Whisper.startListening();
    } catch (e) {
      setError((e as Error).message);
      setIsListening(false);
    }
  }, []);

  const stopListeningNative = useCallback(async () => {
    try {
      const { default: Whisper } = await import('../plugins/whisper');
      const result = await Whisper.stopListening();
      setTranscript(result.transcript);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsListening(false);
    }
  }, []);

  const startListeningWeb = useCallback(async () => {
    try {
      setError(null);
      setTranscript(null);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const recorder = new MediaRecorder(stream, { mimeType });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.start(100); // collect data every 100ms
      mediaRecorderRef.current = recorder;
      setIsListening(true);
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  const stopListeningWeb = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;

    return new Promise<void>((resolve) => {
      recorder.onstop = async () => {
        // Stop all tracks to release the microphone
        recorder.stream.getTracks().forEach((t) => t.stop());

        const blob = new Blob(chunksRef.current, { type: recorder.mimeType });
        chunksRef.current = [];

        try {
          const result = await api.transcribeAudio(blob);
          setTranscript(result.transcript);
        } catch (e) {
          setError((e as Error).message);
        } finally {
          setIsListening(false);
          mediaRecorderRef.current = null;
          resolve();
        }
      };

      recorder.stop();
    });
  }, []);

  const startListening = useCallback(async () => {
    if (isNative) {
      await startListeningNative();
    } else {
      await startListeningWeb();
    }
  }, [isNative, startListeningNative, startListeningWeb]);

  const stopListening = useCallback(async () => {
    if (isNative) {
      await stopListeningNative();
    } else {
      await stopListeningWeb();
    }
  }, [isNative, stopListeningNative, stopListeningWeb]);

  const reset = useCallback(() => {
    setTranscript(null);
    setError(null);
    setIsListening(false);
  }, []);

  return {
    isListening,
    transcript,
    error,
    isSupported,
    startListening,
    stopListening,
    reset,
  };
}

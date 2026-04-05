/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useRef, useCallback, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { api } from '../api/client';
import { speak } from '../utils/speechSynthesis';

/**
 * Voice assistant states:
 * - idle: mic button visible, waiting for tap
 * - listening: mic active, streaming transcript
 * - processing: LLM parsing the transcript
 * - confirming: LLM asked a clarification question, waiting for answer
 * - executing: running the API action
 * - speaking: TTS playing confirmation
 * - error: something went wrong
 */
export type VoiceState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'confirming'
  | 'executing'
  | 'speaking'
  | 'error';

interface VoiceResult {
  type: 'action' | 'clarification' | 'status_response' | 'error';
  action?: string;
  params?: Record<string, any>;
  confirmation_text?: string;
  question?: string;
  status_text?: string;
}

export function useVoiceAssistant(babyId: number | null, onCommandExecuted?: () => void) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [displayText, setDisplayText] = useState('');
  const [error, setError] = useState<string | null>(null);

  const conversationHistory = useRef<{ role: string; content: string }[]>([]);
  const recognitionRef = useRef<any>(null);
  const continuousTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNative = Capacitor.isNativePlatform();

  // Check if speech recognition is available
  const isSupported = useCallback(() => {
    if (isNative) return true; // Capacitor plugin handles it
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR;
  }, [isNative]);

  // Start listening
  const startListening = useCallback(async () => {
    if (!babyId) return;
    setState('listening');
    setTranscript('');
    setError(null);

    try {
      await Haptics.impact({ style: ImpactStyle.Medium });
    } catch { /* non-native */ }

    if (isNative) {
      // Use Capacitor native speech recognition
      try {
        const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');

        const available = await SpeechRecognition.available();
        if (!available.available) {
          setState('error');
          setError('Speech recognition not available');
          return;
        }

        const permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
          await SpeechRecognition.requestPermissions();
        }

        // Listen for partial results
        await SpeechRecognition.addListener('partialResults', (data: any) => {
          if (data.matches?.length) {
            setTranscript(data.matches[0]);
          }
        });

        await SpeechRecognition.start({
          language: 'en-US',
          partialResults: true,
          popup: false,
        });

        // Listen for final result
        SpeechRecognition.addListener('listeningState', async (data: any) => {
          if (data.status === 'stopped') {
            // Get the final result
            setTranscript(prev => {
              if (prev) processTranscript(prev);
              return prev;
            });
          }
        });

      } catch (e: any) {
        setState('error');
        setError(e.message || 'Failed to start listening');
      }
    } else {
      // Web Speech API fallback (works in Chrome desktop/Android browser)
      const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SR) {
        setState('error');
        setError('Speech recognition not supported in this browser');
        return;
      }

      const recognition = new SR();
      recognition.lang = 'en-US';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognitionRef.current = recognition;

      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          } else {
            interimTranscript += event.results[i][0].transcript;
          }
        }
        setTranscript(finalTranscript || interimTranscript);
        if (finalTranscript) {
          processTranscript(finalTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error !== 'no-speech') {
          setState('error');
          setError(event.error);
        } else {
          setState('idle');
        }
      };

      recognition.onend = () => {
        // If we're still in listening state and got no result, go back to idle
        setState(prev => prev === 'listening' ? 'idle' : prev);
      };

      recognition.start();
    }
  }, [babyId, isNative]);

  // Stop listening
  const stopListening = useCallback(async () => {
    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
        await SpeechRecognition.stop();
      } catch { /* ignore */ }
    } else if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, [isNative]);

  // Process transcript through the LLM
  const processTranscript = useCallback(async (text: string) => {
    if (!text.trim() || !babyId) {
      setState('idle');
      return;
    }

    setState('processing');
    setDisplayText(text);

    try {
      const result: VoiceResult = await api.request('/voice/parse', {
        method: 'POST',
        body: JSON.stringify({
          transcript: text,
          baby_id: babyId,
          conversation_history: conversationHistory.current.length > 0
            ? conversationHistory.current
            : null,
        }),
        headers: { 'Content-Type': 'application/json' },
      });

      // Track conversation
      conversationHistory.current.push({ role: 'user', content: text });

      if (result.type === 'clarification' && result.question) {
        // LLM needs more info — ask and listen again
        setState('confirming');
        setDisplayText(result.question);
        conversationHistory.current.push({ role: 'assistant', content: result.question });
        await speak(result.question);
        // Auto-restart listening after question
        setTimeout(() => startListening(), 500);
        return;
      }

      if (result.type === 'status_response' && result.status_text) {
        setState('speaking');
        setDisplayText(result.status_text);
        await speak(result.status_text);
        finishConversation();
        return;
      }

      if (result.type === 'action' && result.action) {
        setState('executing');
        setDisplayText(result.confirmation_text || 'Done');
        await executeAction(result.action, result.params || {});
        setState('speaking');
        try {
          await Haptics.notification({ type: NotificationType.Success });
        } catch { /* non-native */ }
        // Refresh dashboard
        onCommandExecuted?.();
        if (result.confirmation_text) {
          await speak(result.confirmation_text);
        }
        // Auto-dismiss after confirmation
        setTimeout(() => {
          setState('idle');
          setDisplayText('');
          setTranscript('');
          conversationHistory.current = [];
        }, 2000);
        return;
      }

      // Error or unknown
      setState('error');
      setError(result.confirmation_text || "I didn't understand that");

    } catch (e: any) {
      setState('error');
      setError(e.message || 'Failed to process command');
    }
  }, [babyId]);

  // Execute the parsed action via the API client
  const executeAction = useCallback(async (action: string, params: Record<string, any>) => {
    if (!babyId) return;
    const now = new Date().toISOString();

    switch (action) {
      case 'createFeeding':
        await api.createFeeding({ baby_id: babyId, time: now, ...params });
        break;
      case 'createDiaper':
        await api.createDiaper({ baby_id: babyId, time: now, ...params });
        break;
      case 'startSleep':
        await api.createSleep({ baby_id: babyId, start_time: now, ...params });
        break;
      case 'endSleep': {
        const active = await api.getCurrentSleep(babyId);
        if (active?.id) {
          await api.endSleep(active.id);
        }
        break;
      }
      case 'createPumping':
        await api.createPumping({ baby_id: babyId, time: now, ...params });
        break;
      case 'createTummyTime':
        await api.createTummyTime({ baby_id: babyId, start_time: now, ...params });
        break;
      case 'createBath':
        await api.createBath({ baby_id: babyId, time: now, ...params });
        break;
      case 'createSupplement':
        await api.createSupplement({ baby_id: babyId, time: now, ...params });
        break;
      case 'createSolid':
        await api.createSolid({ baby_id: babyId, time: now, ...params });
        break;
    }
  }, [babyId]);

  // Continuous listening: after a successful action, keep the mic hot for 5s
  const startContinuousWindow = useCallback(() => {
    setState('idle');
    setDisplayText('');
    conversationHistory.current = [];

    // Auto-listen again after a brief pause
    continuousTimeoutRef.current = setTimeout(() => {
      // Don't auto-restart — just go back to idle
      // User can tap mic again quickly for sequential logging
    }, 5000);
  }, []);

  const finishConversation = useCallback(() => {
    conversationHistory.current = [];
    setTimeout(() => {
      setState('idle');
      setDisplayText('');
    }, 2000);
  }, []);

  // Cancel current operation
  const cancel = useCallback(() => {
    stopListening();
    conversationHistory.current = [];
    setState('idle');
    setTranscript('');
    setDisplayText('');
    setError(null);
    if (continuousTimeoutRef.current) {
      clearTimeout(continuousTimeoutRef.current);
    }
  }, [stopListening]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
      if (continuousTimeoutRef.current) {
        clearTimeout(continuousTimeoutRef.current);
      }
    };
  }, [stopListening]);

  return {
    state,
    transcript,
    displayText,
    error,
    isSupported: isSupported(),
    startListening,
    stopListening,
    cancel,
  };
}

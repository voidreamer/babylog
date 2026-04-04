// ============================================================================
// Voice Command Bar
// ============================================================================
// A floating microphone button that lets users log baby events with voice
// commands. Uses the Web Speech API for recognition and speech synthesis for
// audible confirmation.

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { parseVoiceCommand, describeCommand, ParsedCommand } from '../utils/voiceCommands';
import { speak, getConfirmationText } from '../utils/speechSynthesis';
import { hapticImpact, hapticNotification } from '../utils/haptics';
import { api } from '../api/client';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';

// ---------------------------------------------------------------------------
// Web Speech API type definitions
// ---------------------------------------------------------------------------
// The Web Speech API is not part of TypeScript's standard DOM lib, so we
// declare the minimal interfaces we need here.

interface WebSpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly length: number;
  [index: number]: { transcript: string; confidence: number };
}

interface WebSpeechRecognitionResultList {
  readonly length: number;
  [index: number]: WebSpeechRecognitionResult;
}

interface WebSpeechRecognitionEvent {
  readonly resultIndex: number;
  readonly results: WebSpeechRecognitionResultList;
}

interface WebSpeechRecognitionErrorEvent {
  readonly error: string;
  readonly message: string;
}

interface WebSpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: WebSpeechRecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((event: WebSpeechRecognitionErrorEvent) => void) | null;
  start(): void;
  stop(): void;
  abort(): void;
}

type WebSpeechRecognitionConstructor = new () => WebSpeechRecognition;

// ---------------------------------------------------------------------------
// Web Speech API availability check
// ---------------------------------------------------------------------------

function getSpeechRecognitionConstructor(): WebSpeechRecognitionConstructor | null {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const win = window as any;
  return win.SpeechRecognition ?? win.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getSpeechRecognitionConstructor() !== null;
}

// ---------------------------------------------------------------------------
// Component state machine
// ---------------------------------------------------------------------------

type VoiceState = 'idle' | 'listening' | 'confirming' | 'processing' | 'done' | 'error';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface VoiceCommandBarProps {
  babyId: number;
  onCommandExecuted?: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VoiceCommandBar({ babyId, onCommandExecuted }: VoiceCommandBarProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [transcript, setTranscript] = useState('');
  const [parsedCommand, setParsedCommand] = useState<ParsedCommand | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<WebSpeechRecognition | null>(null);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  // -------------------------------------------------------------------------
  // Recognition lifecycle
  // -------------------------------------------------------------------------

  const startListening = useCallback(() => {
    const Ctor = getSpeechRecognitionConstructor();
    if (!Ctor) return;

    setTranscript('');
    setParsedCommand(null);
    setError(null);

    const recognition = new Ctor();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: WebSpeechRecognitionEvent) => {
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript;
        } else {
          interim += result[0].transcript;
        }
      }
      setTranscript(final || interim);
    };

    recognition.onend = () => {
      // Triggered when recognition finishes (user stopped speaking)
      setTranscript((currentTranscript) => {
        if (currentTranscript.trim()) {
          const parsed = parseVoiceCommand(currentTranscript);
          setParsedCommand(parsed);

          if (parsed.action === 'unknown' || parsed.confidence < 0.3) {
            setError('Could not understand that command. Please try again.');
            setState('error');
          } else {
            setState('confirming');
          }
        } else {
          setError('No speech detected. Please try again.');
          setState('error');
        }
        return currentTranscript;
      });
    };

    recognition.onerror = (event: WebSpeechRecognitionErrorEvent) => {
      if (event.error === 'no-speech') {
        setError('No speech detected. Please try again.');
      } else if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone permissions.');
      } else if (event.error === 'aborted') {
        // User cancelled; do nothing
        setState('idle');
        return;
      } else {
        setError(`Speech error: ${event.error}`);
      }
      setState('error');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setState('listening');
    hapticImpact(ImpactStyle.Medium);
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const cancel = useCallback(() => {
    recognitionRef.current?.abort();
    setState('idle');
    setTranscript('');
    setParsedCommand(null);
    setError(null);
  }, []);

  // -------------------------------------------------------------------------
  // Command execution
  // -------------------------------------------------------------------------

  const executeCommand = useCallback(async () => {
    if (!parsedCommand || parsedCommand.action === 'unknown') return;

    setState('processing');

    try {
      const { action, params } = parsedCommand;
      const now = new Date().toISOString();

      switch (action) {
        case 'feeding': {
          const feedingType = (params.type as string) || 'bottle';
          await api.createFeeding({
            baby_id: babyId,
            time: now,
            type: feedingType,
            amount_ml: (params.amount_ml as number) || null,
            duration_minutes: (params.duration_minutes as number) || null,
            notes: `Voice: "${parsedCommand.rawText}"`,
          });
          break;
        }

        case 'diaper': {
          const diaperType = (params.type as string) || 'pee';
          await api.createDiaper({
            baby_id: babyId,
            time: now,
            type: diaperType,
            notes: `Voice: "${parsedCommand.rawText}"`,
          });
          break;
        }

        case 'sleep_start': {
          await api.createSleep({
            baby_id: babyId,
            start_time: now,
            notes: `Voice: "${parsedCommand.rawText}"`,
          });
          break;
        }

        case 'sleep_end': {
          // Find the active sleep to end it
          const sleeps = await api.getSleeps(babyId);
          const activeSleep = sleeps?.find((s: { end_time: string | null }) => !s.end_time);
          if (activeSleep) {
            await api.endSleep(activeSleep.id as number);
          } else {
            toast.info('No active sleep to end');
          }
          break;
        }

        case 'tummy_time': {
          const duration = (params.duration_minutes as number) || 5;
          await api.createTummyTime({
            baby_id: babyId,
            start_time: now,
            duration_minutes: duration,
            notes: `Voice: "${parsedCommand.rawText}"`,
          });
          break;
        }

        case 'bath': {
          await api.createBath({
            baby_id: babyId,
            time: now,
            notes: `Voice: "${parsedCommand.rawText}"`,
          });
          break;
        }

        case 'status': {
          // Status is informational; we just toast the summary
          toast.info('Check the Daily Summary section below for today\'s overview.');
          break;
        }

        default:
          break;
      }

      // Success
      setState('done');
      await hapticNotification(NotificationType.Success);

      const confirmText = getConfirmationText(parsedCommand);
      toast.success(confirmText);
      speak(confirmText);

      onCommandExecuted?.();

      // Auto-dismiss after 2s
      dismissTimerRef.current = setTimeout(() => {
        setState('idle');
        setTranscript('');
        setParsedCommand(null);
      }, 2000);

    } catch (err) {
      console.error('Voice command execution failed:', err);
      setError('Failed to execute command. Please try again.');
      setState('error');
      await hapticNotification(NotificationType.Error);
    }
  }, [parsedCommand, babyId, onCommandExecuted]);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const isActive = state !== 'idle';

  return (
    <>
      {/* Backdrop overlay when active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="voice-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={cancel}
          />
        )}
      </AnimatePresence>

      {/* Main container */}
      <div className="voice-bar-container">
        <AnimatePresence mode="wait">
          {/* ---- LISTENING: pulsing mic + live transcript ---- */}
          {state === 'listening' && (
            <motion.div
              key="listening"
              className="voice-panel"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <div className="voice-panel-content">
                <motion.div
                  className="voice-pulse-ring"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
                />
                <motion.button
                  className="voice-mic-active"
                  onClick={stopListening}
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'easeInOut' }}
                  aria-label="Stop listening"
                >
                  <Mic size={28} />
                </motion.button>
                <p className="voice-listening-label">Listening...</p>
                {transcript && (
                  <p className="voice-transcript">&ldquo;{transcript}&rdquo;</p>
                )}
                <button className="voice-cancel-btn" onClick={cancel}>
                  Cancel
                </button>
              </div>
            </motion.div>
          )}

          {/* ---- CONFIRMING: parsed result + confirm/cancel ---- */}
          {state === 'confirming' && parsedCommand && (
            <motion.div
              key="confirming"
              className="voice-panel"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <div className="voice-panel-content">
                <p className="voice-heard-label">I heard:</p>
                <p className="voice-transcript">&ldquo;{transcript}&rdquo;</p>
                <div className="voice-confirm-action">
                  <span className="voice-action-badge" data-action={parsedCommand.action}>
                    {describeCommand(parsedCommand)}
                  </span>
                  {parsedCommand.confidence < 0.6 && (
                    <span className="voice-low-confidence">Low confidence</span>
                  )}
                </div>
                <div className="voice-confirm-buttons">
                  <motion.button
                    className="voice-btn voice-btn-confirm"
                    onClick={executeCommand}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Confirm command"
                  >
                    <Check size={18} />
                    <span>Confirm</span>
                  </motion.button>
                  <motion.button
                    className="voice-btn voice-btn-cancel"
                    onClick={cancel}
                    whileTap={{ scale: 0.95 }}
                    aria-label="Cancel command"
                  >
                    <X size={18} />
                    <span>Cancel</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}

          {/* ---- PROCESSING: loading state ---- */}
          {state === 'processing' && (
            <motion.div
              key="processing"
              className="voice-panel"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <div className="voice-panel-content">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 size={32} className="voice-spinner" />
                </motion.div>
                <p className="voice-processing-label">Logging...</p>
              </div>
            </motion.div>
          )}

          {/* ---- DONE: success checkmark ---- */}
          {state === 'done' && (
            <motion.div
              key="done"
              className="voice-panel"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <div className="voice-panel-content">
                <motion.div
                  className="voice-success-icon"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  <Check size={32} />
                </motion.div>
                <p className="voice-success-label">
                  {parsedCommand ? getConfirmationText(parsedCommand) : 'Done!'}
                </p>
              </div>
            </motion.div>
          )}

          {/* ---- ERROR: error message + retry ---- */}
          {state === 'error' && (
            <motion.div
              key="error"
              className="voice-panel"
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.25 }}
            >
              <div className="voice-panel-content">
                <MicOff size={28} className="voice-error-icon" />
                <p className="voice-error-text">{error}</p>
                <div className="voice-confirm-buttons">
                  <motion.button
                    className="voice-btn voice-btn-confirm"
                    onClick={startListening}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Mic size={18} />
                    <span>Try Again</span>
                  </motion.button>
                  <motion.button
                    className="voice-btn voice-btn-cancel"
                    onClick={cancel}
                    whileTap={{ scale: 0.95 }}
                  >
                    <X size={18} />
                    <span>Cancel</span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---- FAB: floating mic button (visible only when idle) ---- */}
        <AnimatePresence>
          {state === 'idle' && (
            <motion.button
              className="voice-fab"
              onClick={startListening}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
              aria-label="Voice command"
            >
              <Mic size={22} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}

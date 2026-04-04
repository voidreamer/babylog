import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, X, Loader2 } from 'lucide-react';
import { useVoiceAssistant } from '../hooks/useVoiceAssistant';

interface VoiceCommandBarProps {
  babyId: number;
  onCommandExecuted?: () => void;
}

export function VoiceCommandBar({ babyId, onCommandExecuted }: VoiceCommandBarProps) {
  const {
    state,
    transcript,
    displayText,
    error,
    isSupported,
    startListening,
    stopListening,
    cancel,
  } = useVoiceAssistant(babyId);

  if (!isSupported) return null;

  const isActive = state !== 'idle';

  return (
    <>
      {/* Overlay when active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="voice-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={cancel}
          />
        )}
      </AnimatePresence>

      {/* Floating panel when active */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            className="voice-panel"
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Cancel button */}
            <button className="voice-cancel" onClick={cancel} aria-label="Cancel">
              <X size={18} />
            </button>

            {/* State indicator */}
            <div className="voice-state-indicator">
              {state === 'listening' && (
                <div className="voice-listening-ring">
                  <motion.div
                    className="voice-pulse"
                    animate={{ scale: [1, 1.4, 1], opacity: [0.6, 0, 0.6] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  />
                  <Mic size={28} className="voice-mic-active" />
                </div>
              )}
              {state === 'processing' && <Loader2 size={28} className="voice-spinner" />}
              {state === 'executing' && <Loader2 size={28} className="voice-spinner" />}
              {state === 'speaking' && (
                <motion.div
                  className="voice-speaking-indicator"
                  animate={{ scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.6, repeat: Infinity }}
                >
                  🔊
                </motion.div>
              )}
              {state === 'confirming' && (
                <div className="voice-listening-ring">
                  <Mic size={28} className="voice-mic-active" />
                </div>
              )}
              {state === 'error' && <span className="voice-error-icon">⚠️</span>}
            </div>

            {/* Status text */}
            <div className="voice-status">
              {state === 'listening' && (
                <p className="voice-status-text">
                  {transcript || 'Listening...'}
                </p>
              )}
              {state === 'processing' && (
                <p className="voice-status-text">Thinking...</p>
              )}
              {state === 'confirming' && (
                <p className="voice-status-text voice-question">{displayText}</p>
              )}
              {state === 'executing' && (
                <p className="voice-status-text">{displayText}</p>
              )}
              {state === 'speaking' && (
                <p className="voice-status-text voice-confirmation">{displayText}</p>
              )}
              {state === 'error' && (
                <p className="voice-status-text voice-error-text">
                  {error || 'Something went wrong'}
                </p>
              )}
            </div>

            {/* Transcript preview */}
            {state === 'processing' && transcript && (
              <p className="voice-transcript-preview">"{transcript}"</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mic button */}
      <motion.button
        className={`voice-fab ${isActive ? 'voice-fab-active' : ''}`}
        onClick={isActive ? (state === 'listening' ? stopListening : cancel) : startListening}
        whileTap={{ scale: 0.9 }}
        aria-label={isActive ? 'Stop listening' : 'Voice command'}
      >
        {isActive && state === 'listening' ? (
          <MicOff size={24} />
        ) : (
          <Mic size={24} />
        )}
      </motion.button>
    </>
  );
}

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return !!(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export default VoiceCommandBar;

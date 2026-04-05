import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Loader2 } from 'lucide-react';
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
  } = useVoiceAssistant(babyId, onCommandExecuted);

  if (!isSupported) return null;

  const isActive = state !== 'idle';
  const showBadge = isActive && (displayText || transcript || error);

  return (
    <>
      {/* Inline status badge — floats above mic, auto-dismisses */}
      <AnimatePresence>
        {showBadge && (
          <motion.div
            className="voice-badge"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            onClick={cancel}
          >
            {state === 'listening' && (
              <span className="voice-badge-text">{transcript || 'Listening...'}</span>
            )}
            {state === 'processing' && (
              <span className="voice-badge-text voice-badge-dim">
                <Loader2 size={14} className="voice-badge-spinner" />
                {transcript ? `"${transcript}"` : 'Thinking...'}
              </span>
            )}
            {state === 'confirming' && (
              <span className="voice-badge-text voice-badge-question">{displayText}</span>
            )}
            {(state === 'executing' || state === 'speaking') && (
              <span className="voice-badge-text voice-badge-success">{displayText}</span>
            )}
            {state === 'error' && (
              <span className="voice-badge-text voice-badge-error">{error}</span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating mic button */}
      <motion.button
        className={`voice-fab ${state === 'listening' ? 'voice-fab-listening' : ''} ${state === 'error' ? 'voice-fab-error' : ''}`}
        onClick={isActive ? (state === 'listening' ? stopListening : cancel) : startListening}
        whileTap={{ scale: 0.9 }}
        aria-label={isActive ? 'Stop listening' : 'Voice command'}
      >
        {state === 'listening' ? (
          <MicOff size={24} />
        ) : state === 'processing' || state === 'executing' ? (
          <Loader2 size={24} className="voice-badge-spinner" />
        ) : (
          <Mic size={24} />
        )}
      </motion.button>
    </>
  );
}

export default VoiceCommandBar;

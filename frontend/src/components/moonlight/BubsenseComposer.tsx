import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
} from 'react';
import { useTranslation } from 'react-i18next';
import { useBubsense, type BubsenseHandoff } from '../../hooks/useBubsense';
import { useDictation } from '../../hooks/useDictation';
import { hapticNotification, hapticSelection } from '../../utils/haptics';
import { Icon } from './Icon';

export interface BubsenseComposerHandle {
  focus: () => void;
  startDictation: () => void;
}

type Props = {
  babyId: number;
  /** Refresh the dashboard after Bubsense logs something. */
  onActionExecuted: () => void;
  /**
   * Open the full Bubsense chat (premium Q&A), carrying the composer's
   * conversation so an in-progress clarification isn't lost.
   */
  onExpand: (handoff: BubsenseHandoff) => void;
};

/**
 * The Bubsense composer — the app's single free-text entry point.
 *
 * Typing is the primary path ("120ml 20 min ago", "wet diaper"); the mic
 * dictates INTO the input so the parent reviews the text before sending —
 * nothing executes straight off a transcript. Answers/confirmations render
 * inline; the expand arrow opens the full chat.
 */
const BubsenseComposer = forwardRef<BubsenseComposerHandle, Props>(
  function BubsenseComposer({ babyId, onActionExecuted, onExpand }, ref) {
    const { t } = useTranslation(['dashboard', 'common']);
    const [input, setInput] = useState('');
    const [online, setOnline] = useState(() =>
      typeof navigator === 'undefined' ? true : navigator.onLine,
    );
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    // Text present when the mic opened — partials append to it instead of
    // clobbering what was already typed.
    const dictationBaseRef = useRef('');

    const bubsense = useBubsense(babyId, onActionExecuted);
    const lastReply =
      bubsense.messages.length > 0
        ? bubsense.messages[bubsense.messages.length - 1]
        : null;
    const [replyDismissed, setReplyDismissed] = useState(false);

    const dictation = useDictation({
      onTranscript: (text, isFinal) => {
        const base = dictationBaseRef.current;
        setInput(base ? `${base} ${text}` : text);
        if (isFinal) inputRef.current?.focus();
      },
    });

    useEffect(() => {
      const goOnline = () => setOnline(true);
      const goOffline = () => setOnline(false);
      window.addEventListener('online', goOnline);
      window.addEventListener('offline', goOffline);
      return () => {
        window.removeEventListener('online', goOnline);
        window.removeEventListener('offline', goOffline);
      };
    }, []);

    // Callbacks read the current text from inputRef (a controlled textarea's
    // .value mirrors state) instead of closing over `input`, so none of them —
    // nor the imperative handle — are rebuilt per keystroke.
    const currentText = useCallback(() => (inputRef.current?.value ?? '').trim(), []);

    const toggleDictation = useCallback(() => {
      hapticSelection();
      if (dictation.state === 'listening') {
        void dictation.stop();
      } else {
        dictationBaseRef.current = currentText();
        void dictation.start();
      }
    }, [currentText, dictation]);

    const send = useCallback(async () => {
      const text = currentText();
      // Mirror the send button's disabled conditions — Enter must not bypass
      // the offline guard.
      if (!text || bubsense.status === 'sending' || !online) return;
      if (dictation.state === 'listening') void dictation.stop();
      setInput('');
      setReplyDismissed(false);
      const result = await bubsense.send(text);
      if (result?.type === 'action') hapticNotification();
      // A clarification means Bubsense is waiting on the parent's answer.
      if (result?.type === 'clarification') inputRef.current?.focus();
      // Parse failed — give the parent their words back instead of making
      // them retype (only if they haven't started typing something new).
      if (result?.type === 'error') setInput((current) => current || text);
    }, [bubsense, currentText, dictation, online]);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        startDictation: () => {
          if (dictation.state !== 'listening') {
            dictationBaseRef.current = currentText();
            void dictation.start();
          }
        },
      }),
      [currentText, dictation],
    );

    const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void send();
      }
    };

    const roundButton: CSSProperties = {
      width: 38,
      height: 38,
      borderRadius: 999,
      border: '0.5px solid var(--ml-line)',
      background: 'transparent',
      color: 'var(--ml-text-2)',
      cursor: 'pointer',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'inherit',
      flexShrink: 0,
    };

    const micUnavailable =
      dictation.state === 'denied' || dictation.state === 'error';

    return (
      <div
        style={{
          marginTop: 18,
          borderRadius: 18,
          background: 'var(--ml-surface)',
          border: '0.5px solid color-mix(in srgb, var(--ml-accent) 35%, var(--ml-line))',
          padding: 12,
          color: 'var(--ml-text)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div className="mono" style={{ color: 'var(--ml-accent)' }}>
            {t('dashboard:bubsense.composerLabel', { defaultValue: 'bubsense' })}
          </div>
          <button
            type="button"
            onClick={() => {
              hapticSelection();
              onExpand(bubsense.snapshot());
            }}
            aria-label={t('dashboard:bubsense.openChat', {
              defaultValue: 'Open Bubsense chat',
            })}
            style={{ ...roundButton, width: 30, height: 30, border: 'none' }}
          >
            <Icon.Arrow />
          </button>
        </div>

        {lastReply?.role === 'assistant' && !replyDismissed && (
          <div
            role="status"
            aria-live="polite"
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
              padding: '9px 12px',
              marginBottom: 8,
              borderRadius: '14px 14px 14px 4px',
              background: 'color-mix(in srgb, var(--ml-text) 5%, transparent)',
              border: '0.5px solid var(--ml-line)',
              fontSize: 14,
              lineHeight: 1.4,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>{lastReply.content}</div>
            <button
              type="button"
              onClick={() => setReplyDismissed(true)}
              aria-label={t('common:close')}
              style={{
                ...roundButton,
                width: 24,
                height: 24,
                border: 'none',
                color: 'var(--ml-text-3)',
              }}
            >
              <Icon.Close />
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKey}
            placeholder={
              dictation.state === 'listening'
                ? t('common:voice.listeningHint', { defaultValue: 'I’m listening…' })
                : t('dashboard:bubsense.composerPlaceholder', {
                    defaultValue: '"120ml 20 min ago", "wet diaper", "how’s her day?"',
                  })
            }
            rows={1}
            style={{
              flex: 1,
              resize: 'none',
              border: '0.5px solid var(--ml-line)',
              background: 'var(--ml-bg)',
              borderRadius: 18,
              padding: '9px 14px',
              fontFamily: 'inherit',
              fontSize: 14,
              lineHeight: 1.4,
              color: 'var(--ml-text)',
              maxHeight: 96,
              outline: 'none',
            }}
          />
          {dictation.isSupported && (
            <button
              type="button"
              onClick={toggleDictation}
              aria-label={
                dictation.state === 'listening'
                  ? t('common:voice.stopDictation', { defaultValue: 'Stop dictation' })
                  : t('common:voice.startDictation', { defaultValue: 'Dictate' })
              }
              aria-pressed={dictation.state === 'listening'}
              style={{
                ...roundButton,
                ...(dictation.state === 'listening'
                  ? {
                      background: 'color-mix(in srgb, var(--ml-accent) 22%, transparent)',
                      color: 'var(--ml-accent)',
                      borderColor: 'var(--ml-accent)',
                    }
                  : {}),
              }}
            >
              <Icon.Mic />
            </button>
          )}
          <button
            type="button"
            onClick={() => void send()}
            disabled={!input.trim() || bubsense.status === 'sending' || !online}
            aria-label={t('common:voice.send', { defaultValue: 'Send' })}
            style={{
              ...roundButton,
              border: 'none',
              background: 'var(--ml-accent)',
              color: '#0a0706',
              opacity: input.trim() && bubsense.status !== 'sending' && online ? 1 : 0.5,
              cursor:
                input.trim() && bubsense.status !== 'sending' && online
                  ? 'pointer'
                  : 'not-allowed',
            }}
          >
            {bubsense.status === 'sending' ? (
              <span aria-hidden="true">
                <span className="bub-dot" />
                <span className="bub-dot" />
                <span className="bub-dot" />
              </span>
            ) : (
              <Icon.Send />
            )}
          </button>
        </div>

        {!online && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ml-text-3)' }}>
            {t('dashboard:bubsense.offlineHint', {
              defaultValue: 'Bubsense needs a connection — the buttons above still log offline.',
            })}
          </div>
        )}
        {micUnavailable && (
          <div style={{ marginTop: 8, fontSize: 12, color: 'var(--ml-text-3)' }}>
            {dictation.state === 'denied'
              ? t('common:voice.micDenied', {
                  defaultValue: 'Microphone access is off — you can type, or enable it in system settings.',
                })
              : t('common:voice.micError', {
                  defaultValue: 'Dictation isn’t available right now — typing works.',
                })}
          </div>
        )}
      </div>
    );
  },
);

// Memoized: Home re-renders every 30s from the dashboard poll (elapsed-time
// headlines need it); the composer subtree shouldn't come along for the ride.
export default memo(BubsenseComposer);

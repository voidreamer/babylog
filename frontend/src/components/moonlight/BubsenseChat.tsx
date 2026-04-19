/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Lock } from 'lucide-react';
import { api } from '../../api/client';
import { Icon } from './Icon';

type Message = { role: 'user' | 'assistant'; content: string };

type Props = {
  babyId: number;
  isPremium: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  onCommandExecuted?: () => void;
};

/**
 * Ask-Bubsense chat modal.
 *
 * Reuses the /voice/parse endpoint (same LLM the voice assistant talks to) for
 * text-based Q&A. Multi-turn: conversation history is passed with each request
 * so follow-ups ("and what about this week?") keep context.
 *
 * Premium gated — free users see an upgrade prompt. This is the first place in
 * the moonlight UI that's explicitly paywalled.
 */
export default function BubsenseChat({
  babyId,
  isPremium,
  onClose,
  onUpgrade,
  onCommandExecuted,
}: Props) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    if (isPremium && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isPremium]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sending]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    setInput('');
    const nextMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setSending(true);
    try {
      const result: any = await api.request('/voice/parse', {
        method: 'POST',
        body: JSON.stringify({
          transcript: text,
          baby_id: babyId,
          conversation_history: nextMessages.slice(0, -1),
        }),
        headers: { 'Content-Type': 'application/json' },
      });
      let reply = '';
      if (result?.type === 'clarification' && result.question) {
        reply = result.question;
      } else if (result?.type === 'status_response' && result.status_text) {
        reply = result.status_text;
      } else if (result?.type === 'action') {
        reply =
          result.confirmation_text ||
          t('dashboard:toast_savedSuccessfully', { defaultValue: 'Saved.' });
        // Action was persisted server-side — refresh dashboard on the caller.
        onCommandExecuted?.();
      } else if (result?.confirmation_text) {
        reply = result.confirmation_text;
      } else {
        reply = t('common:voice.errorGeneric', {
          defaultValue: 'I\u2019m not sure what to say there.',
        });
      }
      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
    } catch (e: any) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            e?.message ||
            t('common:voice.errorGeneric', { defaultValue: 'Something went wrong.' }),
        },
      ]);
    } finally {
      setSending(false);
    }
  }, [babyId, input, messages, onCommandExecuted, sending, t]);

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('dashboard:bubsense.askBubsense', { defaultValue: 'Ask Bubsense' })}
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(10, 7, 6, 0.5)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        zIndex: 200,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: 0,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 520,
          maxHeight: '88vh',
          background: 'var(--ml-bg)',
          borderRadius: '24px 24px 0 0',
          boxShadow: '0 -20px 60px rgba(0,0,0,0.3)',
          display: 'flex',
          flexDirection: 'column',
          color: 'var(--ml-text)',
          overflow: 'hidden',
          border: '0.5px solid var(--ml-line)',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '18px 20px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            borderBottom: '0.5px solid var(--ml-line)',
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              background: 'color-mix(in srgb, var(--ml-accent) 18%, transparent)',
              color: 'var(--ml-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Sparkles size={16} aria-hidden="true" />
          </div>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 16,
                fontWeight: 500,
                letterSpacing: -0.2,
              }}
            >
              {t('dashboard:bubsense.askBubsense', { defaultValue: 'Ask Bubsense' })}
            </div>
            <div className="mono" style={{ marginTop: 1 }}>
              {isPremium
                ? t('dashboard:bubsense.subtitle', {
                    defaultValue: 'your private baby expert',
                  })
                : t('dashboard:bubsense.premiumSubtitle', {
                    defaultValue: 'premium',
                  })}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common:close')}
            style={{
              width: 34,
              height: 34,
              borderRadius: 999,
              border: '0.5px solid var(--ml-line)',
              background: 'transparent',
              color: 'var(--ml-text-2)',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            <Icon.Close />
          </button>
        </div>

        {!isPremium ? (
          <div
            style={{
              padding: 28,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              gap: 12,
            }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 999,
                background: 'color-mix(in srgb, var(--ml-accent) 14%, transparent)',
                color: 'var(--ml-accent)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Lock size={22} aria-hidden="true" />
            </div>
            <h3
              className="serif italic"
              style={{
                margin: 0,
                fontSize: 26,
                fontWeight: 400,
                letterSpacing: -0.3,
                color: 'var(--ml-text)',
              }}
            >
              {t('dashboard:bubsense.lockTitle', {
                defaultValue: 'A private baby expert, always on.',
              })}
            </h3>
            <p
              className="serif italic"
              style={{
                fontSize: 15,
                color: 'var(--ml-text-2)',
                lineHeight: 1.4,
                maxWidth: 360,
                margin: 0,
              }}
            >
              {t('dashboard:bubsense.lockBody', {
                defaultValue:
                  'Ask anything about your baby\u2019s patterns, sleep, feedings — Bubsense answers with just your data as context.',
              })}
            </p>
            <button
              type="button"
              onClick={() => {
                onClose();
                onUpgrade();
              }}
              style={{
                marginTop: 8,
                padding: '12px 24px',
                borderRadius: 999,
                border: 'none',
                background: 'var(--ml-accent)',
                color: '#0a0706',
                fontSize: 14,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {t('dashboard:bubsense.upgradeCta', { defaultValue: 'Upgrade' })}
            </button>
          </div>
        ) : (
          <>
            {/* Messages */}
            <div
              ref={scrollRef}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              {messages.length === 0 && (
                <div
                  className="serif italic"
                  style={{
                    color: 'var(--ml-text-3)',
                    textAlign: 'center',
                    padding: '24px 12px',
                    fontSize: 15,
                    lineHeight: 1.4,
                  }}
                >
                  {t('dashboard:bubsense.empty', {
                    defaultValue:
                      'Ask about sleep windows, feed intervals, growth \u2014 anything about your baby\u2019s data.',
                  })}
                </div>
              )}
              {messages.map((m, i) => (
                <div
                  key={i}
                  style={{
                    alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    padding: '9px 13px',
                    borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                    background:
                      m.role === 'user'
                        ? 'var(--ml-accent)'
                        : 'color-mix(in srgb, var(--ml-text) 5%, transparent)',
                    color: m.role === 'user' ? '#0a0706' : 'var(--ml-text)',
                    border:
                      m.role === 'assistant'
                        ? '0.5px solid var(--ml-line)'
                        : 'none',
                    fontSize: 14,
                    lineHeight: 1.4,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                  }}
                >
                  {m.content}
                </div>
              ))}
              {sending && (
                <div
                  style={{
                    alignSelf: 'flex-start',
                    padding: '9px 13px',
                    borderRadius: '16px 16px 16px 4px',
                    background: 'color-mix(in srgb, var(--ml-text) 5%, transparent)',
                    border: '0.5px solid var(--ml-line)',
                  }}
                  aria-live="polite"
                >
                  <span className="bub-dot" />
                  <span className="bub-dot" />
                  <span className="bub-dot" />
                </div>
              )}
            </div>

            {/* Input */}
            <div
              style={{
                padding: '10px 14px calc(env(safe-area-inset-bottom, 0px) + 14px)',
                borderTop: '0.5px solid var(--ml-line)',
                display: 'flex',
                gap: 8,
                alignItems: 'flex-end',
                background: 'var(--ml-bg)',
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder={t('dashboard:bubsense.placeholder', {
                  defaultValue: 'Ask about your baby\u2026',
                })}
                rows={1}
                disabled={sending}
                style={{
                  flex: 1,
                  resize: 'none',
                  border: '0.5px solid var(--ml-line)',
                  background: 'var(--ml-surface)',
                  borderRadius: 18,
                  padding: '10px 14px',
                  fontFamily: 'inherit',
                  fontSize: 14,
                  lineHeight: 1.4,
                  color: 'var(--ml-text)',
                  maxHeight: 120,
                  outline: 'none',
                }}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!input.trim() || sending}
                aria-label={t('common:voice.send', { defaultValue: 'Send' })}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 999,
                  border: 'none',
                  background: 'var(--ml-accent)',
                  color: '#0a0706',
                  cursor: input.trim() && !sending ? 'pointer' : 'not-allowed',
                  opacity: input.trim() && !sending ? 1 : 0.5,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                <Icon.Send />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

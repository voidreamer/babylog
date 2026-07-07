import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBubsenseProvider } from '../lib/bubsense/provider';
import { executeBubsenseAction } from '../lib/bubsense/actions';
import type { BubsenseMessage, BubsenseResult } from '../lib/bubsense/types';

export type BubsenseStatus = 'idle' | 'sending';

/**
 * Bubsense conversation state machine: send a message, parse it through the
 * active provider, execute any resulting action against the REST API, and
 * keep the running transcript so clarification follow-ups stay in context.
 */
export function useBubsense(babyId: number | null, onActionExecuted?: () => void) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [messages, setMessages] = useState<BubsenseMessage[]>([]);
  const [status, setStatus] = useState<BubsenseStatus>('idle');
  const sendingRef = useRef(false);

  const send = useCallback(
    async (rawText: string): Promise<BubsenseResult | null> => {
      const text = rawText.trim();
      if (!text || !babyId || sendingRef.current) return null;

      sendingRef.current = true;
      setStatus('sending');
      const history = messages;
      setMessages((m) => [...m, { role: 'user', content: text }]);

      let result: BubsenseResult;
      try {
        const provider = await getBubsenseProvider();
        result = await provider.parse({ text, babyId, history });

        if (result.type === 'action' && result.action) {
          await executeBubsenseAction(babyId, result.action, result.params || {});
          onActionExecuted?.();
        }
      } catch (e) {
        result = {
          type: 'error',
          confirmation_text:
            (e as Error)?.message ||
            t('common:voice.errorGeneric', { defaultValue: 'Something went wrong. Try again.' }),
        };
      }

      const reply =
        (result.type === 'clarification' && result.question) ||
        (result.type === 'status_response' && result.status_text) ||
        result.confirmation_text ||
        (result.type === 'action'
          ? t('dashboard:toast_savedSuccessfully', { defaultValue: 'Saved.' })
          : t('common:voice.errorGeneric', { defaultValue: 'I’m not sure what to say there.' }));

      setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      sendingRef.current = false;
      setStatus('idle');
      return result;
    },
    [babyId, messages, onActionExecuted, t],
  );

  const reset = useCallback(() => {
    sendingRef.current = false;
    setMessages([]);
    setStatus('idle');
  }, []);

  return { messages, status, send, reset };
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getBubsenseProvider } from '../lib/bubsense/provider';
import { executeBubsenseAction } from '../lib/bubsense/actions';
import type { BubsenseMessage, BubsenseResult } from '../lib/bubsense/types';

export type BubsenseStatus = 'idle' | 'sending';

/** An action parsed from chat that awaits the parent's one-tap confirmation. */
export interface PendingBubsenseAction {
  action: string;
  params: Record<string, unknown>;
  summary: string;
}

/** Conversation state carried from the composer into the expanded chat. */
export interface BubsenseHandoff {
  messages: BubsenseMessage[];
  context: BubsenseMessage[];
}

export interface UseBubsenseOptions {
  /**
   * Hold `action` results as pendingAction until confirm()/dismiss() instead
   * of executing immediately. For Q&A surfaces (chat) where a misclassified
   * question must not silently write a record. Logging surfaces (composer)
   * leave this off — immediate execution is their job.
   */
  confirmActions?: boolean;
  /** Seed conversation from another surface (see BubsenseHandoff). */
  initial?: BubsenseHandoff;
}

/** Server context is capped to the most recent turns of the open exchange. */
const MAX_CONTEXT_TURNS = 10;

/**
 * Bubsense conversation state machine: send a message, parse it through the
 * active provider, execute (or stage) any resulting action, and keep just
 * enough context for follow-ups.
 *
 * Display transcript and parser context are deliberately separate: finished
 * exchanges stay visible in `messages`, but only an UNRESOLVED exchange (an
 * open clarification, or a Q&A thread after a status answer) is re-sent as
 * conversation_history — re-sending completed "Logged…" turns biases the
 * tool-calling LLM into echoing old actions.
 */
export function useBubsense(
  babyId: number | null,
  onActionExecuted?: () => void,
  options?: UseBubsenseOptions,
) {
  const { t } = useTranslation(['common', 'dashboard']);
  const [messages, setMessages] = useState<BubsenseMessage[]>(
    () => options?.initial?.messages ?? [],
  );
  const [status, setStatus] = useState<BubsenseStatus>('idle');
  const [pendingAction, setPendingAction] = useState<PendingBubsenseAction | null>(null);
  const pendingContextRef = useRef<BubsenseMessage[]>(options?.initial?.context ?? []);

  // A different baby means a different conversation.
  const lastBabyRef = useRef(babyId);
  useEffect(() => {
    if (lastBabyRef.current !== babyId) {
      lastBabyRef.current = babyId;
      pendingContextRef.current = [];
      setMessages([]);
      setPendingAction(null);
      setStatus('idle');
    }
  }, [babyId]);

  const savedReply = useCallback(
    () => t('dashboard:toast_savedSuccessfully', { defaultValue: 'Saved.' }),
    [t],
  );

  const send = useCallback(
    async (rawText: string): Promise<BubsenseResult | null> => {
      const text = rawText.trim();
      if (!text || !babyId || status === 'sending') return null;

      setStatus('sending');
      setPendingAction(null);
      const history = pendingContextRef.current;
      setMessages((m) => [...m, { role: 'user', content: text }]);

      let result: BubsenseResult;
      try {
        const provider = await getBubsenseProvider();
        result = await provider.parse({ text, babyId, history });

        if (result.type === 'action' && result.action && !options?.confirmActions) {
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
          ? savedReply()
          : t('common:voice.errorGeneric', { defaultValue: 'I’m not sure what to say there.' }));

      if (result.type === 'action' && result.action && options?.confirmActions) {
        // Stage instead of execute. No assistant reply is appended here — the
        // surface renders the confirm bubble from pendingAction, and the reply
        // lands on confirm/dismiss.
        setPendingAction({
          action: result.action,
          params: result.params || {},
          summary: result.confirmation_text || savedReply(),
        });
      } else {
        setMessages((m) => [...m, { role: 'assistant', content: reply }]);
      }

      // Context lifecycle: a completed action closes the exchange; an open
      // clarification or a Q&A answer keeps it alive (capped) for follow-ups.
      if (result.type === 'clarification' || result.type === 'status_response') {
        pendingContextRef.current = [
          ...history,
          { role: 'user' as const, content: text },
          { role: 'assistant' as const, content: reply },
        ].slice(-MAX_CONTEXT_TURNS);
      } else if (result.type === 'action') {
        pendingContextRef.current = [];
      }
      // On error the context is left as-is so a retry behaves like the first try.

      setStatus('idle');
      return result;
    },
    [babyId, onActionExecuted, options?.confirmActions, savedReply, status, t],
  );

  /** Execute the staged action (confirmActions surfaces only). */
  const confirmPending = useCallback(async () => {
    if (!babyId || !pendingAction || status === 'sending') return;
    setStatus('sending');
    try {
      await executeBubsenseAction(babyId, pendingAction.action, pendingAction.params);
      onActionExecuted?.();
      setMessages((m) => [...m, { role: 'assistant', content: pendingAction.summary }]);
      pendingContextRef.current = [];
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          role: 'assistant',
          content:
            (e as Error)?.message ||
            t('common:voice.errorGeneric', { defaultValue: 'Something went wrong. Try again.' }),
        },
      ]);
    } finally {
      setPendingAction(null);
      setStatus('idle');
    }
  }, [babyId, onActionExecuted, pendingAction, status, t]);

  const dismissPending = useCallback(() => {
    setPendingAction(null);
    setMessages((m) => [
      ...m,
      {
        role: 'assistant',
        content: t('dashboard:bubsense.notLogged', { defaultValue: 'Okay — not logged.' }),
      },
    ]);
  }, [t]);

  /** Snapshot for carrying the conversation into another surface. */
  const snapshot = useCallback(
    (): BubsenseHandoff => ({ messages, context: pendingContextRef.current }),
    [messages],
  );

  return useMemo(
    () => ({ messages, status, pendingAction, send, confirmPending, dismissPending, snapshot }),
    [messages, status, pendingAction, send, confirmPending, dismissPending, snapshot],
  );
}

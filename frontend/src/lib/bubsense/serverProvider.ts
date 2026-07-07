import { api } from '../../api/client';
import type { BubsenseProvider, BubsenseRequest, BubsenseResult } from './types';

/**
 * Server-side parsing via POST /voice/parse (LLM with tool calling).
 * Requires network; the endpoint returns 503 when no LLM key is configured.
 */
export const serverProvider: BubsenseProvider = {
  id: 'server',

  async isAvailable() {
    return typeof navigator === 'undefined' || navigator.onLine;
  },

  async parse(req: BubsenseRequest): Promise<BubsenseResult> {
    return api.request('/voice/parse', {
      method: 'POST',
      body: JSON.stringify({
        transcript: req.text,
        baby_id: req.babyId,
        conversation_history: req.history?.length ? req.history : null,
      }),
      headers: { 'Content-Type': 'application/json' },
    });
  },
};

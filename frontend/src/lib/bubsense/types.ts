/* eslint-disable @typescript-eslint/no-explicit-any */

/** What Bubsense understood from the parent's message. */
export type BubsenseResultType = 'action' | 'clarification' | 'status_response' | 'error';

export interface BubsenseResult {
  type: BubsenseResultType;
  /** Action name, e.g. 'createFeeding' — see executeBubsenseAction. */
  action?: string;
  params?: Record<string, any>;
  confirmation_text?: string;
  question?: string;
  status_text?: string;
}

export interface BubsenseMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface BubsenseRequest {
  text: string;
  babyId: number;
  /** Prior turns, so clarification follow-ups keep context. */
  history?: BubsenseMessage[];
}

/**
 * A Bubsense parsing backend. Parsing (natural language → structured result)
 * is provider-swappable; executing the resulting action against the REST API
 * always happens on the client (see actions.ts).
 */
export interface BubsenseProvider {
  id: 'server' | 'on-device';
  isAvailable(): Promise<boolean>;
  parse(req: BubsenseRequest): Promise<BubsenseResult>;
}

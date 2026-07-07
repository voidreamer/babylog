import type { BubsenseProvider, BubsenseRequest, BubsenseResult } from './types';

/**
 * On-device parsing — not implemented yet.
 *
 * Planned (Phase 2): a Capacitor plugin exposing platform models —
 * Apple Foundation Models on iOS 26+ (tool calling via @Generable types
 * mirroring the same JSON tool schema the server uses) and Gemini Nano via
 * AICore/ML Kit GenAI on Android. Plugin surface:
 *   isAvailable(): Promise<{ available: boolean }>
 *   parse({ system, messages, tools }): Promise<{ toolCall?, text? }>
 * Baby context will be built client-side (cached dashboard data or a
 * lightweight GET /voice/context). Any per-request failure falls back to
 * the server provider, so this can ship behind availability detection.
 */
export const onDeviceProvider: BubsenseProvider = {
  id: 'on-device',

  async isAvailable() {
    return false;
  },

  async parse(_req: BubsenseRequest): Promise<BubsenseResult> {
    throw new Error('On-device Bubsense is not available yet');
  },
};

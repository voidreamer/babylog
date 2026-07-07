import { onDeviceProvider } from './onDeviceProvider';
import { serverProvider } from './serverProvider';
import type { BubsenseProvider } from './types';

let resolved: BubsenseProvider | null = null;

/**
 * Pick the best available parsing backend: on-device when the platform
 * supports it, otherwise the server. Resolution is cached for the session;
 * availability is a device property, not a per-request one.
 */
export async function getBubsenseProvider(): Promise<BubsenseProvider> {
  if (resolved) return resolved;
  if (await onDeviceProvider.isAvailable()) {
    resolved = onDeviceProvider;
  } else {
    resolved = serverProvider;
  }
  return resolved;
}

/**
 * TypeScript interface for the KeychainPlugin Capacitor plugin.
 * Bridges Supabase auth tokens to iOS Keychain for Siri intents.
 */
import { registerPlugin } from '@capacitor/core';

export interface KeychainPlugin {
  /** Store Supabase auth tokens in Keychain. */
  setToken(options: { accessToken: string; refreshToken: string }): Promise<{ success: boolean }>;

  /** Read Supabase auth tokens from Keychain. */
  getToken(): Promise<{ accessToken: string | null; refreshToken: string | null }>;

  /** Store the active baby in App Group UserDefaults. */
  setActiveBaby(options: { babyId: number; babyName: string }): Promise<{ success: boolean }>;

  /** Read the active baby from App Group UserDefaults. */
  getActiveBaby(): Promise<{ babyId: number; babyName: string }>;
}

const Keychain = registerPlugin<KeychainPlugin>('KeychainPlugin');

export default Keychain;

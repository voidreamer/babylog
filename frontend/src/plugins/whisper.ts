/**
 * TypeScript interface for the WhisperPlugin Capacitor plugin.
 * On iOS, this wraps whisper.cpp for on-device transcription.
 */
import { registerPlugin } from '@capacitor/core';

export interface WhisperPlugin {
  /** Check microphone permission status. */
  checkPermission(): Promise<{ status: 'granted' | 'denied' | 'prompt' }>;

  /** Request microphone permission. */
  requestPermission(): Promise<{ status: 'granted' | 'denied' }>;

  /** Start capturing audio via AVAudioEngine. */
  startListening(): Promise<void>;

  /** Stop capture and run whisper inference. Returns the transcript. */
  stopListening(): Promise<{ transcript: string }>;

  /** Check if the whisper model is loaded and ready. */
  isReady(): Promise<{ ready: boolean }>;
}

const Whisper = registerPlugin<WhisperPlugin>('WhisperPlugin');

export default Whisper;

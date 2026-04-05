/* eslint-disable @typescript-eslint/no-explicit-any */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || '';

const ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // "Sarah" — warm, friendly
const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`;
const DEEPGRAM_URL = 'https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3';

let elevenlabsFailed = false;
let audioUnlocked = false;

// Shared audio element — iOS Safari only allows play() on elements
// that were first played during a user gesture. We create it once on
// mic tap and reuse it for all subsequent TTS playback.
let sharedAudio: HTMLAudioElement | null = null;

/**
 * Unlock audio playback on Safari / iOS.
 * Must be called synchronously from a user-gesture handler (e.g. mic tap).
 * iOS Safari requires the *same* Audio element that was gesture-played
 * to be reused for later non-gesture playback.
 */
export function unlockAudio(): void {
  if (audioUnlocked) return;
  audioUnlocked = true;

  // Create the shared audio element and play silent audio to "unlock" it
  try {
    sharedAudio = new Audio();
    sharedAudio.src =
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=';
    sharedAudio.play().catch(() => {});
  } catch { /* ignore */ }

  // Also prime an AudioContext (used by some WebViews)
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtx) {
      const ctx = new AudioCtx();
      ctx.resume().catch(() => {});
    }
  } catch { /* ignore */ }

  // Unlock speechSynthesis with a near-silent utterance
  try {
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0.01;
      u.rate = 10;
      window.speechSynthesis.speak(u);
    }
  } catch { /* ignore */ }
}

/**
 * Play audio from a Blob using the shared (gesture-unlocked) HTMLAudioElement.
 * Falls back to a new element if unlockAudio() wasn't called.
 * Rejects on failure so the tiered TTS chain can fall through.
 */
function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = sharedAudio || new Audio();

    // Reset handlers from any previous playback
    audio.onended = null;
    audio.onerror = null;

    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback failed'));
    };

    audio.src = url;
    audio.volume = 1.0;
    audio.load();
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch((err) => {
        URL.revokeObjectURL(url);
        reject(err);
      });
    }
  });
}

/**
 * ElevenLabs Flash v2.5 TTS.
 */
async function speakElevenLabs(text: string): Promise<boolean> {
  if (!ELEVENLABS_API_KEY || elevenlabsFailed) return false;
  try {
    const resp = await fetch(ELEVENLABS_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'audio/mpeg',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!resp.ok) {
      if (resp.status === 401 || resp.status === 429) {
        elevenlabsFailed = true;
      }
      return false;
    }
    const blob = await resp.blob();
    await playAudioBlob(blob);
    return true;
  } catch {
    return false;
  }
}

/**
 * Deepgram Aura TTS.
 */
async function speakDeepgram(text: string): Promise<boolean> {
  if (!DEEPGRAM_API_KEY) return false;
  try {
    const resp = await fetch(DEEPGRAM_URL, {
      method: 'POST',
      headers: {
        Authorization: `Token ${DEEPGRAM_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    if (!resp.ok) return false;
    const blob = await resp.blob();
    await playAudioBlob(blob);
    return true;
  } catch {
    return false;
  }
}

/**
 * Browser SpeechSynthesis (always available, free).
 */
function speakBrowser(text: string): Promise<void> {
  return new Promise((resolve) => {
    if (!('speechSynthesis' in window)) {
      resolve();
      return;
    }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;

    let resolved = false;
    const safeResolve = () => {
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };
    utterance.onend = safeResolve;
    utterance.onerror = safeResolve;

    const trySpeak = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        utterance.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
      }
      window.speechSynthesis.speak(utterance);
      // Safari bug: long utterances pause after ~15s and never resume
      const keepAlive = setInterval(() => {
        if (!window.speechSynthesis.speaking) {
          clearInterval(keepAlive);
        } else {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }, 14000);
      // Safety timeout: Safari sometimes never fires onend
      setTimeout(() => {
        clearInterval(keepAlive);
        safeResolve();
      }, 30000);
    };

    // Safari loads voices async — wait if they're not ready yet
    if (window.speechSynthesis.getVoices().length === 0) {
      const onReady = () => {
        window.speechSynthesis.removeEventListener('voiceschanged', onReady);
        trySpeak();
      };
      window.speechSynthesis.addEventListener('voiceschanged', onReady);
      // Fallback if voiceschanged never fires (some WebViews)
      setTimeout(() => {
        window.speechSynthesis.removeEventListener('voiceschanged', onReady);
        if (!resolved) trySpeak();
      }, 300);
    } else {
      trySpeak();
    }
  });
}

/**
 * Speak text with tiered TTS:
 * 1. ElevenLabs Flash (75ms, best quality)
 * 2. Deepgram Aura (90ms, good quality)
 * 3. Web Speech API (0ms, free fallback)
 */
export async function speak(text: string): Promise<void> {
  if (await speakElevenLabs(text)) {
    console.log('[TTS] played via ElevenLabs');
    return;
  }
  if (await speakDeepgram(text)) {
    console.log('[TTS] played via Deepgram');
    return;
  }
  console.log('[TTS] falling back to browser speechSynthesis');
  await speakBrowser(text);
}

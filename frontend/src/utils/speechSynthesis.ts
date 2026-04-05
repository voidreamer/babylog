/* eslint-disable @typescript-eslint/no-explicit-any */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || '';

const ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // "Sarah" — warm, friendly
const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`;
const DEEPGRAM_URL = 'https://api.deepgram.com/v1/speak?model=aura-asteria-en&encoding=mp3';

let elevenlabsFailed = false;

/**
 * Play audio from a Blob using an HTMLAudioElement.
 * This works reliably across Safari, Chrome, and Capacitor WebView
 * (unlike AudioContext which Safari blocks without user gesture).
 */
function playAudioBlob(blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.onended = () => {
      URL.revokeObjectURL(url);
      resolve();
    };
    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Audio playback failed'));
    };
    // Safari sometimes needs this
    audio.load();
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        URL.revokeObjectURL(url);
        resolve(); // Silently fall through if autoplay blocked
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
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    // Safari workaround: sometimes voices aren't loaded yet
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      utterance.voice = voices.find(v => v.lang.startsWith('en')) || voices[0];
    }
    window.speechSynthesis.speak(utterance);
  });
}

/**
 * Speak text with tiered TTS:
 * 1. ElevenLabs Flash (75ms, best quality)
 * 2. Deepgram Aura (90ms, good quality)
 * 3. Web Speech API (0ms, free fallback)
 */
export async function speak(text: string): Promise<void> {
  if (await speakElevenLabs(text)) return;
  if (await speakDeepgram(text)) return;
  await speakBrowser(text);
}

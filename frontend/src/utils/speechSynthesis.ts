/* eslint-disable @typescript-eslint/no-explicit-any */

const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY || '';
const DEEPGRAM_API_KEY = import.meta.env.VITE_DEEPGRAM_API_KEY || '';

// ElevenLabs Flash v2.5 — fast, high quality
const ELEVENLABS_VOICE_ID = 'EXAVITQu4vr4xnSDxMaL'; // "Sarah" — warm, friendly
const ELEVENLABS_URL = `https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/stream`;

// Deepgram Aura — fallback
const DEEPGRAM_URL = 'https://api.deepgram.com/v1/speak?model=aura-asteria-en';

let elevenlabsFailed = false;
let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext();
  }
  return audioContext;
}

/**
 * Play audio from an ArrayBuffer.
 */
async function playAudio(buffer: ArrayBuffer): Promise<void> {
  const ctx = getAudioContext();
  // Resume if suspended (browser autoplay policy)
  if (ctx.state === 'suspended') await ctx.resume();
  const audioBuffer = await ctx.decodeAudioData(buffer);
  const source = ctx.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(ctx.destination);
  return new Promise((resolve) => {
    source.onended = () => resolve();
    source.start();
  });
}

/**
 * Try ElevenLabs TTS. Returns true if successful.
 */
async function speakElevenLabs(text: string): Promise<boolean> {
  if (!ELEVENLABS_API_KEY || elevenlabsFailed) return false;
  try {
    const resp = await fetch(ELEVENLABS_URL, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_flash_v2_5',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });
    if (!resp.ok) {
      // 401 = bad key, 429 = quota exceeded
      if (resp.status === 401 || resp.status === 429) {
        elevenlabsFailed = true;
      }
      return false;
    }
    const buffer = await resp.arrayBuffer();
    await playAudio(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Try Deepgram Aura TTS. Returns true if successful.
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
    const buffer = await resp.arrayBuffer();
    await playAudio(buffer);
    return true;
  } catch {
    return false;
  }
}

/**
 * Browser built-in SpeechSynthesis (always available, free).
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
    utterance.volume = 0.8;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
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
  // Try ElevenLabs first
  if (await speakElevenLabs(text)) return;
  // Try Deepgram
  if (await speakDeepgram(text)) return;
  // Fall back to browser
  await speakBrowser(text);
}

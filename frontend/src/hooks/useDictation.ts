/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Capacitor } from '@capacitor/core';

/**
 * Speech-to-text dictation. Emits transcripts to a callback and never acts on
 * them — the caller (the Bubsense composer) puts the text in an input the
 * user reviews before sending.
 *
 * Fixes over the old voice assistant's STT:
 * - recognition language follows the app locale instead of hardcoded en-US
 * - native plugin listeners are tracked and removed (they used to accumulate
 *   across sessions and fire duplicates)
 * - a denied mic/speech permission surfaces as state 'denied' instead of
 *   failing later
 */
export type DictationState = 'idle' | 'listening' | 'denied' | 'error';

/** i18n language → BCP-47 tag the recognizers expect. */
const RECOGNITION_LOCALES: Record<string, string> = {
  en: 'en-US',
  hi: 'hi-IN',
  ja: 'ja-JP',
  ru: 'ru-RU',
};

function recognitionLocale(language: string): string {
  if (language.includes('-')) return language; // es-CO, fr-CA, zh-CN
  return RECOGNITION_LOCALES[language] ?? language;
}

interface UseDictationOptions {
  /** Called with the cumulative transcript of the current dictation session. */
  onTranscript: (text: string, isFinal: boolean) => void;
}

export function useDictation({ onTranscript }: UseDictationOptions) {
  const { i18n } = useTranslation();
  const isNative = Capacitor.isNativePlatform();
  const [state, setState] = useState<DictationState>('idle');

  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  const webRecognitionRef = useRef<any>(null);
  const nativeListenersRef = useRef<{ remove: () => Promise<void> }[]>([]);
  const lastNativeTranscriptRef = useRef('');

  const isSupported = isNative
    ? true
    : !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);

  const removeNativeListeners = useCallback(async () => {
    const handles = nativeListenersRef.current;
    nativeListenersRef.current = [];
    await Promise.all(handles.map((h) => h.remove().catch(() => {})));
  }, []);

  const start = useCallback(async () => {
    const lang = recognitionLocale(i18n.language || 'en');

    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');

        const available = await SpeechRecognition.available();
        if (!available.available) {
          setState('error');
          return;
        }

        let permission = await SpeechRecognition.checkPermissions();
        if (permission.speechRecognition !== 'granted') {
          permission = await SpeechRecognition.requestPermissions();
          if (permission.speechRecognition !== 'granted') {
            setState('denied');
            return;
          }
        }

        // Fresh listeners per session — stale ones from a previous session
        // would double-fire transcripts.
        await removeNativeListeners();
        lastNativeTranscriptRef.current = '';

        nativeListenersRef.current.push(
          await SpeechRecognition.addListener('partialResults', (data: any) => {
            const match = data.matches?.[0];
            if (match) {
              lastNativeTranscriptRef.current = match;
              onTranscriptRef.current(match, false);
            }
          }),
          await SpeechRecognition.addListener('listeningState', (data: any) => {
            if (data.status === 'stopped') {
              setState('idle');
              if (lastNativeTranscriptRef.current) {
                onTranscriptRef.current(lastNativeTranscriptRef.current, true);
              }
              void removeNativeListeners();
            }
          }),
        );

        await SpeechRecognition.start({
          language: lang,
          partialResults: true,
          popup: false,
        });
        setState('listening');
      } catch {
        await removeNativeListeners();
        setState('error');
      }
      return;
    }

    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      setState('error');
      return;
    }

    const recognition = new SR();
    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = false;
    webRecognitionRef.current = recognition;

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const text = finalTranscript || interimTranscript;
      if (text) onTranscriptRef.current(text, !!finalTranscript);
      if (finalTranscript) setState('idle');
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setState('denied');
      } else if (event.error === 'no-speech' || event.error === 'aborted') {
        setState('idle');
      } else {
        setState('error');
      }
    };

    recognition.onend = () => {
      webRecognitionRef.current = null;
      setState((prev) => (prev === 'listening' ? 'idle' : prev));
    };

    recognition.start();
    setState('listening');
  }, [i18n.language, isNative, removeNativeListeners]);

  const stop = useCallback(async () => {
    if (isNative) {
      try {
        const { SpeechRecognition } = await import('@capgo/capacitor-speech-recognition');
        await SpeechRecognition.stop();
      } catch {
        /* stopping a stopped recognizer is fine */
      }
    } else if (webRecognitionRef.current) {
      webRecognitionRef.current.stop();
    }
  }, [isNative]);

  useEffect(() => {
    return () => {
      if (webRecognitionRef.current) {
        try {
          webRecognitionRef.current.abort();
        } catch {
          /* ignore */
        }
        webRecognitionRef.current = null;
      }
      void removeNativeListeners();
      if (isNative) {
        import('@capgo/capacitor-speech-recognition')
          .then(({ SpeechRecognition }) => SpeechRecognition.stop())
          .catch(() => {});
      }
    };
  }, [isNative, removeNativeListeners]);

  return { state, isSupported, start, stop };
}

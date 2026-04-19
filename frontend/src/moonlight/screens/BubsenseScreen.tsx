import { useEffect, useRef, useState } from 'react';
import { Orb } from '../components/Orb';
import { Icon } from '../components/Icon';
import type { BubsenseScreenProps, OrbMode } from '../types';

type Msg = { role: 'user' | 'bub'; text: string };

type ClaudeCompleteMessage = { role: string; content: string };
type ClaudeCompleteArgs = { messages: ClaudeCompleteMessage[] };
type ClaudeBridge = { complete: (args: ClaudeCompleteArgs) => Promise<string> };

type RecognitionResult = { 0: { transcript: string }; isFinal: boolean };
type RecognitionEvent = { resultIndex: number; results: ArrayLike<RecognitionResult> };
type RecognitionInstance = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: ((e: RecognitionEvent) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
type RecognitionCtor = new () => RecognitionInstance;

declare global {
  interface Window {
    claude?: ClaudeBridge;
    SpeechRecognition?: RecognitionCtor;
    webkitSpeechRecognition?: RecognitionCtor;
  }
}

const SUGGESTIONS = [
  'Is she feeding enough?',
  'Why is she waking at 3am?',
  'When should the next nap be?',
  'How is her growth tracking?',
];

export function BubsenseScreen({ go, ctx, lastFeed, startMode }: BubsenseScreenProps) {
  const [q, setQ] = useState('');
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = useRef<RecognitionInstance | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const since = ctx.nowMin - lastFeed;
  const babyContext = `
BABY DATA (right now):
- Name: Mila, 4 months old, female
- Weight: 6.2kg (65th percentile), Height: 62cm (70th pct)
- Last feed: ${Math.floor(since / 60)}h ${since % 60}m ago (left breast, 14 min)
- Feed pattern: roughly every 2h 50m, averaging 7 feeds/24h
- Sleep: slept 4h 12m last night (longest stretch), total 14h 30m/24h
- Recent diapers: 6 today (4 wet, 2 dirty, last 1h ago)
- Notable: 3am wake is drifting 21 min later vs last week
- Next pediatrician: April 28 (4mo checkup), recent vitals normal
- Time: ${ctx.clock} am, night mode
`.trim();

  const ask = async (text: string) => {
    const userMsg = text.trim();
    if (!userMsg || loading) return;
    setMessages((m) => [...m, { role: 'user', text: userMsg }]);
    setQ('');
    setLoading(true);
    try {
      if (!window.claude) throw new Error('No Claude bridge');
      const reply = await window.claude.complete({
        messages: [
          {
            role: 'user',
            content: `You are bubsense — a warm, concise baby-care assistant built into the Moonlight app. A tired parent is asking. Answer in 1-3 short sentences. Be specific, reference the data when relevant, and never hedge with medical disclaimers unless it's clearly a health emergency. Speak like a trusted friend, not a chatbot.

${babyContext}

Parent asks: "${userMsg}"`,
          },
        ],
      });
      setMessages((m) => [...m, { role: 'bub', text: reply.trim() }]);
      if (voiceMode && 'speechSynthesis' in window) {
        const u = new SpeechSynthesisUtterance(reply);
        u.rate = 1.0;
        u.pitch = 1.05;
        speechSynthesis.speak(u);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'bub', text: "Hmm, I couldn't reach the cloud just now. Try again in a moment." },
      ]);
    }
    setLoading(false);
  };

  const startListen = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setMessages((m) => [
        ...m,
        { role: 'bub', text: "Voice isn't available in this browser — try typing." },
      ]);
      return;
    }
    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = 'en-US';
    rec.onresult = (e) => {
      let final = '';
      let interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) final += t;
        else interim += t;
      }
      setInterimText(interim);
      if (final) {
        setInterimText('');
        setListening(false);
        ask(final);
      }
    };
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
    setVoiceMode(true);
  };

  const stopListen = () => {
    recognitionRef.current?.stop();
    setListening(false);
  };

  useEffect(() => {
    if (startMode === 'ask') {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
    return () => {
      recognitionRef.current?.stop();
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    };
  }, [startMode]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 99999, behavior: 'smooth' });
  }, [messages, loading]);

  const mode: OrbMode = since < 170 - 15 ? 'calm' : since < 180 ? 'alert' : 'hungry';
  const urgency = Math.max(0, Math.min(1, (since - 100) / 100));

  return (
    <div className="screen-content" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        style={{
          padding: '14px 20px 0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <button
          type="button"
          onClick={() => go('home')}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'var(--surface)',
            border: '0.5px solid var(--line)',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon.Close />
        </button>
        <div style={{ textAlign: 'center' }}>
          <div className="mono">bubsense</div>
          <div
            style={{
              fontSize: 10,
              color: 'var(--text-3)',
              marginTop: 2,
              fontFamily: 'Geist Mono, monospace',
            }}
          >
            knows mila · {Math.floor(since / 60)}h since feed
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            setMessages([]);
            if ('speechSynthesis' in window) speechSynthesis.cancel();
          }}
          style={{
            width: 38,
            height: 38,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-3)',
            cursor: 'pointer',
            fontSize: 11,
            fontFamily: 'Geist Mono, monospace',
          }}
        >
          clear
        </button>
      </div>

      {messages.length === 0 && !listening && (
        <div style={{ padding: '20px 24px 0', textAlign: 'center' }}>
          <Orb size={110} mode={mode} urgency={urgency} />
          <div
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontStyle: 'italic',
              fontSize: 26,
              color: 'var(--text)',
              marginTop: 18,
              letterSpacing: -0.3,
            }}
          >
            What can I tell you
            <br />
            about Mila?
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 8 }}>
            I can see her feeds, sleep, growth, and patterns.
          </div>
        </div>
      )}

      {listening && (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 24,
          }}
        >
          <Orb size={200} mode="hungry" urgency={0.9} />
          <div className="mono" style={{ color: 'var(--accent)' }}>
            listening…
          </div>
          <div
            style={{
              fontFamily: 'Instrument Serif, serif',
              fontStyle: 'italic',
              fontSize: 22,
              color: 'var(--text)',
              padding: '0 40px',
              textAlign: 'center',
              minHeight: 60,
            }}
          >
            {interimText || '…'}
          </div>
          <button
            type="button"
            onClick={stopListen}
            style={{
              padding: '12px 28px',
              borderRadius: 999,
              background: 'var(--surface)',
              border: '0.5px solid var(--line)',
              color: 'var(--text-2)',
              cursor: 'pointer',
              fontSize: 13,
            }}
          >
            tap to stop
          </button>
        </div>
      )}

      {!listening && messages.length > 0 && (
        <div
          ref={scrollRef}
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 20px 12px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
          }}
        >
          {messages.map((m, i) =>
            m.role === 'user' ? (
              <div key={i} style={{ alignSelf: 'flex-end', maxWidth: '80%' }}>
                <div
                  style={{
                    padding: '12px 16px',
                    borderRadius: '22px 22px 4px 22px',
                    background: 'var(--accent)',
                    color: '#0a0706',
                    fontSize: 15,
                    lineHeight: 1.4,
                  }}
                >
                  {m.text}
                </div>
              </div>
            ) : (
              <div
                key={i}
                style={{
                  alignSelf: 'flex-start',
                  maxWidth: '85%',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ flexShrink: 0, marginTop: 2 }}>
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background:
                        'radial-gradient(circle at 30% 30%, #FFEBDC, #F7D4C5 50%, #E8A398 100%)',
                      boxShadow: 'inset -2px -3px 8px #E8A39888',
                    }}
                  />
                </div>
                <div>
                  <div
                    style={{
                      padding: '12px 16px',
                      borderRadius: '4px 22px 22px 22px',
                      background: 'var(--surface)',
                      border: '0.5px solid var(--line)',
                      color: 'var(--text)',
                      fontSize: 15,
                      lineHeight: 1.45,
                      fontFamily: 'Instrument Serif, serif',
                    }}
                  >
                    {m.text}
                  </div>
                </div>
              </div>
            )
          )}
          {loading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: 10, alignItems: 'center' }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background:
                    'radial-gradient(circle at 30% 30%, #FFEBDC, #F7D4C5 50%, #E8A398 100%)',
                }}
              />
              <div
                style={{
                  padding: '14px 18px',
                  borderRadius: 22,
                  background: 'var(--surface)',
                  border: '0.5px solid var(--line)',
                }}
              >
                <span className="bub-dot" />
                <span className="bub-dot" />
                <span className="bub-dot" />
              </div>
            </div>
          )}
        </div>
      )}

      {!listening && messages.length === 0 && (
        <div style={{ padding: '24px 20px 0' }}>
          <div className="mono" style={{ marginBottom: 10 }}>try asking</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {SUGGESTIONS.map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => ask(s)}
                style={{
                  padding: '12px 16px',
                  borderRadius: 14,
                  background: 'var(--surface)',
                  border: '0.5px solid var(--line)',
                  color: 'var(--text)',
                  fontSize: 14,
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'Instrument Serif, serif',
                  fontStyle: 'italic',
                }}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {!listening && (
        <div
          style={{
            padding: '14px 16px 16px',
            borderTop: '0.5px solid var(--line)',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
            background: 'var(--bg)',
          }}
        >
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') ask(q);
            }}
            placeholder="Ask bubsense anything…"
            style={{
              flex: 1,
              padding: '13px 18px',
              borderRadius: 999,
              background: 'var(--surface)',
              border: '0.5px solid var(--line)',
              color: 'var(--text)',
              fontSize: 14,
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
          {q ? (
            <button
              type="button"
              onClick={() => ask(q)}
              disabled={loading}
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'var(--accent)',
                border: 'none',
                color: '#0a0706',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon.Send />
            </button>
          ) : (
            <button
              type="button"
              onClick={startListen}
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: 'var(--accent)',
                border: 'none',
                color: '#0a0706',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon.Mic />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

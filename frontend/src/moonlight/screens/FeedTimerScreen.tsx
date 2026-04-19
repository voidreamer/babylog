import { useEffect, useState } from 'react';
import { Orb } from '../components/Orb';
import { Icon } from '../components/Icon';
import type { ScreenProps } from '../types';

type Side = 'left' | 'right' | 'bottle';

export function FeedTimerScreen({ go, toast }: ScreenProps) {
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [side, setSide] = useState<Side>('left');

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const m = String(Math.floor(elapsed / 60)).padStart(2, '0');
  const s = String(elapsed % 60).padStart(2, '0');

  return (
    <div className="screen-content" style={{ paddingBottom: 40 }}>
      <div
        style={{
          padding: '10px 20px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
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
            border: 'none',
            color: 'var(--text)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon.Close />
        </button>
        <div className="mono">active · feed</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ padding: '40px 20px 0', textAlign: 'center' }}>
        <Orb size={140} mode="hungry" />
        <div
          style={{
            fontFamily: 'Geist Mono, monospace',
            fontSize: 72,
            fontWeight: 300,
            color: 'var(--text)',
            marginTop: 28,
            letterSpacing: -2,
            lineHeight: 1,
          }}
        >
          {m}:{s}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 8 }}>
          {running ? 'Timer running' : 'Paused'}
        </div>
      </div>

      <div style={{ padding: '32px 24px 0' }}>
        <div className="mono" style={{ marginBottom: 10 }}>side</div>
        <div style={{ display: 'flex', gap: 10 }}>
          {(['left', 'right', 'bottle'] as Side[]).map((opt) => (
            <button
              type="button"
              key={opt}
              onClick={() => setSide(opt)}
              style={{
                flex: 1,
                padding: '14px 0',
                background: side === opt ? 'var(--accent)' : 'var(--surface)',
                color: side === opt ? '#0a0706' : 'var(--text)',
                border: `0.5px solid ${side === opt ? 'var(--accent)' : 'var(--line)'}`,
                borderRadius: 14,
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 500,
                textTransform: 'capitalize',
              }}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: '32px 24px 0', display: 'flex', gap: 12 }}>
        <button
          type="button"
          onClick={() => setRunning((r) => !r)}
          style={{
            width: 64,
            height: 64,
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
          {running ? <Icon.Pause /> : <Icon.Play />}
        </button>
        <button
          type="button"
          onClick={() => {
            toast('Feed logged · ' + m + ':' + s);
            go('home');
          }}
          style={{
            flex: 1,
            height: 64,
            borderRadius: 999,
            background: 'var(--accent)',
            color: '#0a0706',
            border: 'none',
            fontSize: 16,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
          }}
        >
          <Icon.Check /> Finish &amp; save
        </button>
      </div>

      <div style={{ padding: '24px 24px 0' }}>
        <div className="mono" style={{ marginBottom: 10 }}>quick notes</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {['Fussy', 'Sleepy after', 'Spit up', 'Good latch', 'Short'].map((t) => (
            <div
              key={t}
              style={{
                padding: '8px 12px',
                borderRadius: 999,
                background: 'var(--surface)',
                color: 'var(--text-2)',
                fontSize: 12,
                cursor: 'pointer',
                border: '0.5px solid var(--line)',
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

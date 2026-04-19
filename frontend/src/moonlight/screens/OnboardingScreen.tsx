import { useState } from 'react';
import { Orb } from '../components/Orb';
import { Icon } from '../components/Icon';
import type { ScreenProps } from '../types';

export function OnboardingScreen({ go, toast }: ScreenProps) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState('Inna');
  const [time, setTime] = useState(1150);
  const [style, setStyle] = useState(1);
  const total = 5;

  const next = () => {
    if (step < total - 1) {
      setStep((s) => s + 1);
    } else {
      toast('Welcome to heybub.');
      go('home');
    }
  };
  const prev = () => setStep((s) => Math.max(0, s - 1));

  return (
    <div className="screen-content" style={{ paddingBottom: 20 }}>
      <div style={{ padding: '24px 28px 0', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div className="mono" style={{ color: 'var(--accent)' }}>
          {String(step + 1).padStart(2, '0')}/{String(total).padStart(2, '0')}
        </div>
        <div
          style={{
            flex: 1,
            height: 2,
            background: 'var(--surface-2)',
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${((step + 1) / total) * 100}%`,
              height: '100%',
              background: 'var(--accent)',
              borderRadius: 2,
              transition: 'width 0.4s',
            }}
          />
        </div>
      </div>

      <div style={{ padding: '52px 32px 0', minHeight: 520 }}>
        {step === 0 && (
          <>
            <div className="mono" style={{ color: 'var(--accent)', marginBottom: 20 }}>
              welcome, caregiver
            </div>
            <h1
              style={{
                fontFamily: 'Geist, sans-serif',
                fontWeight: 300,
                fontSize: 48,
                margin: 0,
                lineHeight: 1.02,
                color: 'var(--text)',
                letterSpacing: -1.5,
              }}
            >
              Hey.
              <br />
              Let's{' '}
              <em className="serif" style={{ color: 'var(--accent)' }}>
                meet
              </em>
              <br />
              your bub.
            </h1>
            <p
              className="serif italic"
              style={{ fontSize: 18, lineHeight: 1.4, color: 'var(--text-2)', marginTop: 26, maxWidth: 280 }}
            >
              A few quiet questions. We'll remember everything so you don't have to.
            </p>
            <div style={{ marginTop: 36, textAlign: 'center' }}>
              <Orb size={140} mode="calm" />
            </div>
          </>
        )}
        {step === 1 && (
          <>
            <div className="mono" style={{ color: 'var(--accent)', marginBottom: 20 }}>
              01 · the name
            </div>
            <h1
              style={{
                fontFamily: 'Geist, sans-serif',
                fontWeight: 300,
                fontSize: 38,
                margin: 0,
                lineHeight: 1.05,
                color: 'var(--text)',
                letterSpacing: -1,
              }}
            >
              What do you
              <br />
              <em className="serif" style={{ color: 'var(--accent)' }}>
                call
              </em>{' '}
              them?
            </h1>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{
                marginTop: 40,
                width: '100%',
                fontFamily: 'Instrument Serif, serif',
                fontStyle: 'italic',
                fontSize: 44,
                background: 'transparent',
                border: 'none',
                borderBottom: '1.5px solid var(--accent)',
                outline: 'none',
                color: 'var(--text)',
                padding: '8px 0',
              }}
            />
            <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 14 }}>
              A nickname works too — it's just between us.
            </div>
          </>
        )}
        {step === 2 && (
          <>
            <div className="mono" style={{ color: 'var(--accent)', marginBottom: 20 }}>
              02 · the rhythm
            </div>
            <h1
              style={{
                fontFamily: 'Geist, sans-serif',
                fontWeight: 300,
                fontSize: 36,
                margin: 0,
                lineHeight: 1.05,
                color: 'var(--text)',
                letterSpacing: -1,
              }}
            >
              When does{' '}
              <em className="serif" style={{ color: 'var(--accent)' }}>
                {name}
              </em>
              <br />
              go down?
            </h1>
            <div
              style={{
                marginTop: 36,
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: 80,
                  fontWeight: 300,
                  color: 'var(--text)',
                  letterSpacing: -2,
                  lineHeight: 1,
                }}
              >
                {Math.floor(time / 60) % 12 || 12}:{String(time % 60).padStart(2, '0')}
              </div>
              <div
                style={{
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: 20,
                  color: 'var(--accent)',
                  marginLeft: 8,
                }}
              >
                {time >= 720 ? 'pm' : 'am'}
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <input
                type="range"
                min="1020"
                max="1380"
                step="15"
                value={time}
                onChange={(e) => setTime(parseInt(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent)' }}
              />
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: 10,
                  color: 'var(--text-3)',
                }}
              >
                <span>5pm</span>
                <span>8pm</span>
                <span>11pm</span>
              </div>
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <div className="mono" style={{ color: 'var(--accent)', marginBottom: 20 }}>
              03 · the style
            </div>
            <h1
              style={{
                fontFamily: 'Geist, sans-serif',
                fontWeight: 300,
                fontSize: 34,
                margin: 0,
                lineHeight: 1.05,
                color: 'var(--text)',
                letterSpacing: -1,
              }}
            >
              How are you
              <br />
              <em className="serif" style={{ color: 'var(--accent)' }}>
                feeding?
              </em>
            </h1>
            <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Breast', 'Bottle', 'Both', 'Solids too'].map((o, i) => (
                <div
                  key={i}
                  onClick={() => setStyle(i)}
                  style={{
                    padding: '16px 18px',
                    borderRadius: 18,
                    background: style === i ? 'var(--accent)' : 'var(--surface)',
                    color: style === i ? '#0a0706' : 'var(--text)',
                    border: `0.5px solid ${style === i ? 'var(--accent)' : 'var(--line)'}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ fontSize: 16, fontWeight: 500 }}>{o}</div>
                  {style === i && <Icon.Check />}
                </div>
              ))}
            </div>
          </>
        )}
        {step === 4 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              paddingTop: 20,
            }}
          >
            <Orb size={180} mode="calm" />
            <h1
              style={{
                fontFamily: 'Geist, sans-serif',
                fontWeight: 300,
                fontSize: 40,
                margin: '28px 0 12px',
                color: 'var(--text)',
                letterSpacing: -1,
                lineHeight: 1.02,
              }}
            >
              Meet{' '}
              <em className="serif" style={{ color: 'var(--accent)' }}>
                bubsense.
              </em>
            </h1>
            <p
              className="serif italic"
              style={{ fontSize: 17, lineHeight: 1.4, color: 'var(--text-2)', maxWidth: 280 }}
            >
              She'll learn {name}'s rhythm and glow with what's next. Feed, nap, quiet, play.
            </p>
          </div>
        )}
      </div>

      <div style={{ padding: '24px 28px 32px', display: 'flex', gap: 10 }}>
        {step > 0 && (
          <button
            type="button"
            onClick={prev}
            style={{
              width: 58,
              height: 58,
              borderRadius: 999,
              background: 'var(--surface)',
              border: '0.5px solid var(--line)',
              color: 'var(--text)',
              fontSize: 18,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Icon.Back />
          </button>
        )}
        <button
          type="button"
          onClick={next}
          style={{
            flex: 1,
            height: 58,
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
          {step === total - 1 ? 'Start tracking' : 'Continue'} <Icon.Arrow />
        </button>
      </div>
    </div>
  );
}

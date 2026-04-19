import { useEffect, useState } from 'react';
import { Orb } from './Orb';
import { TabBar } from './TabBar';
import { Ribbon } from './Ribbon';
import { Spark, Bars } from './Charts';
import { PrimaryBtn, GhostBtn, SectionLabel } from './UI';
import { Icon } from './Icon';
import type { OrbMode, TabKey, TimelineEvent } from './types';

const SAMPLE_EVENTS: TimelineEvent[] = [
  { t: 1, duration: 2, type: 'sleep' },
  { t: 6.5, duration: 0.3, type: 'feed' },
  { t: 8, duration: 0.2, type: 'diaper' },
  { t: 10, duration: 1, type: 'play' },
  { t: 13, duration: 1.5, type: 'sleep' },
  { t: 16, duration: 0.3, type: 'feed' },
];

/**
 * Dev-only smoke surface for the Moonlight design system.
 *
 * Route: /moonlight/preview
 * Gated by localStorage('ui.moonlight')='on'. Without the flag, shows instructions.
 * Removed in Phase 11 when the flag is flipped.
 */
export default function MoonlightPreview() {
  const [flagOn, setFlagOn] = useState(
    () => typeof window !== 'undefined' && localStorage.getItem('ui.moonlight') === 'on',
  );
  const [tab, setTab] = useState<TabKey>('home');
  const [mode, setMode] = useState<OrbMode>('calm');
  const [urgency, setUrgency] = useState(0.3);
  const [dark, setDark] = useState(
    () => typeof document !== 'undefined' && document.documentElement.getAttribute('data-theme') === 'dark',
  );
  const [tapCount, setTapCount] = useState(0);
  const [longPressCount, setLongPressCount] = useState(0);

  const enableFlag = () => {
    localStorage.setItem('ui.moonlight', 'on');
    document.documentElement.setAttribute('data-ui', 'moonlight');
    setFlagOn(true);
  };

  const disableFlag = () => {
    localStorage.removeItem('ui.moonlight');
    document.documentElement.removeAttribute('data-ui');
    setFlagOn(false);
  };

  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    setDark(!dark);
  };

  useEffect(() => {
    if (flagOn) document.documentElement.setAttribute('data-ui', 'moonlight');
  }, [flagOn]);

  if (!flagOn) {
    return (
      <div style={{ padding: 32, maxWidth: 560, margin: '0 auto', fontFamily: 'system-ui' }}>
        <h1>Moonlight preview</h1>
        <p>
          This surface is gated by <code>localStorage('ui.moonlight') = 'on'</code>.
        </p>
        <p>
          <button onClick={enableFlag} type="button">
            Enable Moonlight flag
          </button>
        </p>
        <p style={{ color: '#666', fontSize: 13 }}>
          Phase 0 — foundation only. Flips the <code>data-ui="moonlight"</code> attribute on{' '}
          <code>&lt;html&gt;</code> so scoped <code>--ml-*</code> tokens activate.
        </p>
      </div>
    );
  }

  const MODES: OrbMode[] = ['calm', 'sleepy', 'alert', 'hungry', 'content'];

  return (
    <div style={{ minHeight: '100vh', paddingBottom: 120 }}>
      <div style={{ maxWidth: 520, margin: '0 auto', padding: '32px 20px' }}>
        <div className="mono" style={{ marginBottom: 6 }}>
          Moonlight · Phase 0 smoke
        </div>
        <h1
          className="serif italic"
          style={{ fontSize: 40, margin: 0, fontWeight: 400, letterSpacing: '-0.02em' }}
        >
          Foundation.
        </h1>
        <p className="serif italic" style={{ color: 'var(--ml-text-2)', fontSize: 17, margin: '10px 0 24px' }}>
          Tokens, fonts, primitives — nothing wired to real data yet.
        </p>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
          <GhostBtn onClick={toggleTheme}>
            {dark ? 'Switch to day' : 'Switch to night'}
          </GhostBtn>
          <GhostBtn onClick={disableFlag}>Disable flag</GhostBtn>
        </div>

        <SectionLabel extra={`mode: ${mode} · urgency: ${urgency.toFixed(2)}`}>Orb</SectionLabel>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <Orb
            size={180}
            mode={mode}
            urgency={urgency}
            ariaLabel="Demo orb — tap to log, press and hold to voice"
            onPress={() => setTapCount((c) => c + 1)}
            onLongPress={() => setLongPressCount((c) => c + 1)}
          />
          <div className="mono">
            tap: {tapCount} · long-press: {longPressCount}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: '0.5px solid var(--ml-line)',
                  background: m === mode ? 'var(--ml-accent)' : 'var(--ml-surface)',
                  color: m === mode ? '#0a0706' : 'var(--ml-text)',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={urgency}
            onChange={(e) => setUrgency(parseFloat(e.target.value))}
            aria-label="Urgency"
            style={{ width: '100%' }}
          />
        </div>

        <SectionLabel>Buttons</SectionLabel>
        <div className="card" style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <PrimaryBtn icon>Primary</PrimaryBtn>
          <GhostBtn icon={<Icon.Arrow />}>Ghost</GhostBtn>
          <PrimaryBtn disabled>Disabled</PrimaryBtn>
        </div>

        <SectionLabel>Ribbon · 24h</SectionLabel>
        <div className="card">
          <Ribbon events={SAMPLE_EVENTS} nowFrac={0.62} />
        </div>

        <SectionLabel>Charts</SectionLabel>
        <div className="card" style={{ display: 'flex', alignItems: 'flex-end', gap: 16 }}>
          <Spark data={[3, 4, 3, 5, 6, 5, 7, 6, 8]} color="var(--ml-accent)" w={120} h={40} />
          <div style={{ flex: 1 }}>
            <Bars data={[2, 3, 4, 3, 5, 6, 4]} color="var(--ml-accent)" h={40} highlightAfter={3} />
          </div>
        </div>

        <SectionLabel>Cards</SectionLabel>
        <div className="card card-accent">
          <div className="mono" style={{ marginBottom: 4 }}>accent card</div>
          <div className="serif italic" style={{ fontSize: 22 }}>
            Sleep streak — 3 nights
          </div>
        </div>
      </div>

      <TabBar active={tab} onChange={setTab} />
    </div>
  );
}

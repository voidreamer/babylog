import { useState } from 'react';
import { Bars } from '../components/Charts';
import { SectionLabel } from '../components/UI';

export function InsightsScreen() {
  const [window, setWindow] = useState<'7' | '14' | '30'>('14');

  const observations = [
    { t: 'The 3am wake is drifting later.', s: 'Another week at this pace and you might sleep through.' },
    { t: 'Feeds are 21 min earlier in the evening.', s: 'Your longest stretch now lands 11pm–4am.' },
    {
      t: 'Naps stabilizing at three per day.',
      s: 'Typical for this age — next transition is to two around 6 months.',
    },
  ];

  return (
    <div className="screen-content">
      <div style={{ padding: '10px 24px 0' }}>
        <div className="mono">insights · for inna, 4 months</div>
        <h1
          style={{
            fontFamily: 'Geist, sans-serif',
            fontWeight: 300,
            fontSize: 42,
            margin: '4px 0 0',
            letterSpacing: -1,
            color: 'var(--text)',
          }}
        >
          Fourteen days,
          <br />
          <em className="serif" style={{ color: 'var(--accent)' }}>
            steadier
          </em>{' '}
          nights.
        </h1>
      </div>

      <div style={{ padding: '16px 20px 0', display: 'flex', gap: 6 }}>
        {(['7', '14', '30'] as const).map((w) => (
          <button
            type="button"
            key={w}
            onClick={() => setWindow(w)}
            style={{
              padding: '8px 14px',
              borderRadius: 999,
              background: w === window ? 'var(--accent)' : 'var(--surface)',
              color: w === window ? '#0a0706' : 'var(--text-2)',
              border: '0.5px solid var(--line)',
              cursor: 'pointer',
              fontFamily: 'Geist Mono, monospace',
              fontSize: 11,
              letterSpacing: 0.4,
            }}
          >
            {w} days
          </button>
        ))}
      </div>

      <div style={{ padding: '14px 20px 0' }}>
        <div className="card card-accent">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
            <div>
              <div className="mono">avg nightly sleep</div>
              <div
                style={{
                  fontFamily: 'Geist, sans-serif',
                  fontWeight: 300,
                  fontSize: 52,
                  color: 'var(--text)',
                  marginTop: 6,
                  letterSpacing: -2,
                  lineHeight: 1,
                }}
              >
                9.3<span style={{ fontSize: 18, color: 'var(--accent)' }}> hrs</span>
              </div>
            </div>
            <div style={{ fontFamily: 'Geist Mono, monospace', fontSize: 12, color: '#9BC29E' }}>↑ 42m</div>
          </div>
          <div style={{ marginTop: 20 }}>
            <Bars
              data={[5.2, 6.1, 6.8, 6.2, 7.5, 8.1, 8.4, 9.0, 8.6, 9.2, 9.1, 9.4, 9.0, 9.3]}
              highlightAfter={9}
              color="var(--accent)"
            />
          </div>
        </div>
      </div>

      <div style={{ padding: '12px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div className="card">
          <div className="mono">wake window</div>
          <div
            style={{
              fontFamily: 'Geist, sans-serif',
              fontSize: 26,
              fontWeight: 300,
              marginTop: 4,
              color: 'var(--text)',
            }}
          >
            120<span style={{ fontSize: 14, color: 'var(--text-2)' }}>–180m</span>
          </div>
        </div>
        <div className="card">
          <div className="mono">usual bedtime</div>
          <div
            style={{
              fontFamily: 'Geist, sans-serif',
              fontSize: 26,
              fontWeight: 300,
              marginTop: 4,
              color: 'var(--text)',
            }}
          >
            7:48<span style={{ fontSize: 14, color: 'var(--text-2)' }}> pm</span>
          </div>
        </div>
        <div className="card">
          <div className="mono">feeds / day</div>
          <div
            style={{
              fontFamily: 'Geist, sans-serif',
              fontSize: 26,
              fontWeight: 300,
              marginTop: 4,
              color: 'var(--text)',
            }}
          >
            9.8
          </div>
        </div>
        <div className="card">
          <div className="mono">longest stretch</div>
          <div
            style={{
              fontFamily: 'Geist, sans-serif',
              fontSize: 26,
              fontWeight: 300,
              marginTop: 4,
              color: 'var(--text)',
            }}
          >
            5h <span style={{ fontSize: 14, color: 'var(--text-2)' }}>12m</span>
          </div>
        </div>
      </div>

      <SectionLabel>observations</SectionLabel>
      <div style={{ padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {observations.map((o, i) => (
          <div key={i} className="card">
            <div className="serif" style={{ fontSize: 16, lineHeight: 1.35, color: 'var(--text)' }}>
              {o.t}
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>{o.s}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

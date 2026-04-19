import type { ReactElement } from 'react';
import { Orb } from '../components/Orb';
import { Icon } from '../components/Icon';
import { Ribbon } from '../components/Ribbon';
import { SectionLabel } from '../components/UI';
import type { HomeScreenProps, OrbMode, QuickLogKind } from '../types';

export function HomeScreen({ ctx, go, lastFeed }: HomeScreenProps) {
  const since = ctx.nowMin - lastFeed;
  const toNext = Math.max(0, 170 - since);
  const h = Math.floor(toNext / 60);
  const m = toNext % 60;
  const mode: OrbMode = toNext < 15 ? 'hungry' : toNext < 60 ? 'alert' : 'calm';
  const urgency = Math.max(0, Math.min(1, 1 - toNext / 120));

  const secondaries: { k: QuickLogKind; C: () => ReactElement; l: string; col: string }[] = [
    { k: 'diaper', C: Icon.Diaper, l: 'Diaper', col: '#D9C388' },
    { k: 'note', C: Icon.Note, l: 'Note', col: '#9BC29E' },
    { k: 'pump', C: Icon.Plus, l: 'More', col: 'var(--text-2)' },
  ];

  return (
    <div className="screen-content">
      <div
        style={{
          padding: '10px 24px 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
        }}
      >
        <div>
          <div className="mono">night · {ctx.clock} am</div>
          <div style={{ fontSize: 15, fontWeight: 500, marginTop: 2, color: 'var(--text)' }}>Hey Maya.</div>
        </div>
        <button
          type="button"
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'var(--surface)',
            border: 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--accent)',
            cursor: 'pointer',
          }}
          onClick={() => go('settings')}
        >
          <span style={{ fontFamily: 'Instrument Serif, serif', fontStyle: 'italic', fontSize: 16 }}>I</span>
        </button>
      </div>

      <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
        <Orb
          size={170}
          mode={mode}
          urgency={urgency}
          onPress={() => go('bubsense')}
          onLongPress={() => go('bubsense', { mode: 'ask' })}
        />
      </div>

      <div style={{ padding: '16px 24px 0', textAlign: 'center' }}>
        <div className="mono" style={{ color: 'var(--accent)' }}>next up</div>
        <div
          style={{
            fontFamily: 'Geist, sans-serif',
            fontSize: 44,
            fontWeight: 300,
            color: 'var(--text)',
            marginTop: 6,
            letterSpacing: -1,
            lineHeight: 1.02,
          }}
        >
          {toNext < 10 ? (
            <>
              Feed
              <span className="serif italic" style={{ color: 'var(--accent)' }}>
                {' '}now
              </span>
            </>
          ) : (
            <>
              Feed in
              <br />
              <span className="serif italic" style={{ color: 'var(--accent)' }}>
                {h > 0 ? `${h}h ${m}m` : `${m} min`}
              </span>
            </>
          )}
        </div>
        <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6 }}>
          Last feed {Math.floor(since / 60)}h {since % 60}m ago · ±12 min window
        </div>
      </div>

      <div style={{ padding: '28px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <button
          type="button"
          onClick={() => go('feed-timer')}
          style={{
            padding: '20px 16px',
            borderRadius: 22,
            background: 'var(--accent)',
            color: '#0a0706',
            border: 'none',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <Icon.Feed />
          <div style={{ fontSize: 17, fontWeight: 600, marginTop: 4 }}>Start feed</div>
          <div style={{ fontSize: 11, opacity: 0.7 }}>Tap to begin timer</div>
        </button>
        <button
          type="button"
          onClick={() => go('quick-log', { kind: 'pump' })}
          style={{
            padding: '20px 16px',
            borderRadius: 22,
            background: 'var(--surface)',
            color: 'var(--text)',
            border: '0.5px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ color: '#8BA5C4' }}>
            <Icon.Sleep />
          </div>
          <div style={{ fontSize: 17, fontWeight: 500, marginTop: 4 }}>Log sleep</div>
          <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Start/end time</div>
        </button>
      </div>

      <div style={{ padding: '10px 20px 0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        {secondaries.map((a) => (
          <button
            type="button"
            key={a.k}
            onClick={() => go('quick-log', { kind: a.k })}
            style={{
              padding: '14px 12px',
              borderRadius: 18,
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '0.5px solid var(--line)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
              cursor: 'pointer',
            }}
          >
            <div style={{ color: a.col }}>
              <a.C />
            </div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{a.l}</div>
          </button>
        ))}
      </div>

      <SectionLabel extra="9pm — now">last 6 hours</SectionLabel>
      <div style={{ padding: '0 20px' }}>
        <Ribbon
          compact
          events={[
            { t: 2, duration: 4, type: 'sleep' },
            { t: 8, duration: 0.5, type: 'feed' },
            { t: 9, duration: 5, type: 'sleep' },
            { t: 14.5, duration: 0.4, type: 'diaper' },
          ]}
        />
      </div>

      <SectionLabel>tonight's story</SectionLabel>
      <div style={{ padding: '0 20px' }}>
        <div className="card card-accent">
          <div className="mono" style={{ color: 'var(--accent)' }}>✦ quiet observation</div>
          <div
            className="serif"
            style={{ fontSize: 18, lineHeight: 1.4, marginTop: 8, color: 'var(--text)' }}
          >
            That 3am wake is drifting{' '}
            <em style={{ color: 'var(--accent)' }}>21 minutes later</em> than last week. You might sleep through
            soon.
          </div>
        </div>
      </div>
    </div>
  );
}

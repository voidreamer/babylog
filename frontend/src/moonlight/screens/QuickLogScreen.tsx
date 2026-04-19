import { useState } from 'react';
import { Icon } from '../components/Icon';
import type { QuickLogKind, QuickLogScreenProps } from '../types';

type Cfg = { title: string; options: string[]; c: string };

const CONFIG: Record<QuickLogKind, Cfg> = {
  diaper: { title: 'Log a diaper', options: ['Wet', 'Dirty', 'Both', 'Dry'], c: '#D9C388' },
  note: { title: 'Leave a note', options: ['Fussy', 'Sleepy', 'Happy', 'Hot', 'Rash', 'Smile'], c: '#9BC29E' },
  pump: {
    title: 'Quick log',
    options: ['Pump', 'Medication', 'Bath', 'Tummy time', 'Milestone'],
    c: 'var(--accent)',
  },
};

export function QuickLogScreen({ go, toast, kind }: QuickLogScreenProps) {
  const cfg = CONFIG[kind];
  const [sel, setSel] = useState(0);

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
        <div className="mono">quick log</div>
        <div style={{ width: 38 }} />
      </div>

      <div style={{ padding: '32px 24px 0' }}>
        <h1
          style={{
            fontFamily: 'Geist, sans-serif',
            fontWeight: 300,
            fontSize: 34,
            margin: 0,
            letterSpacing: -1,
            color: 'var(--text)',
          }}
        >
          {cfg.title}
        </h1>
        <div className="mono" style={{ marginTop: 8 }}>
          {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · right now
        </div>
      </div>

      <div
        style={{
          padding: '30px 24px 0',
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 10,
        }}
      >
        {cfg.options.map((o, i) => (
          <button
            type="button"
            key={o}
            onClick={() => setSel(i)}
            style={{
              padding: '22px 14px',
              borderRadius: 20,
              background: sel === i ? cfg.c : 'var(--surface)',
              color: sel === i ? '#0a0706' : 'var(--text)',
              border: `0.5px solid ${sel === i ? cfg.c : 'var(--line)'}`,
              fontSize: 16,
              fontWeight: 500,
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            {o}
          </button>
        ))}
      </div>

      <div style={{ padding: '28px 20px 0' }}>
        <button
          type="button"
          onClick={() => {
            toast((cfg.title.split(' ')[1] || 'Entry') + ' saved.');
            go('home');
          }}
          style={{
            width: '100%',
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
          <Icon.Check /> Save
        </button>
      </div>
    </div>
  );
}

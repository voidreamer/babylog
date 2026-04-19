import { Icon } from '../components/Icon';
import { SectionLabel } from '../components/UI';

const PREFS = [
  { l: 'Notifications', s: 'Feed & nap reminders', val: 'On' },
  { l: 'Night mode', s: 'Auto after sunset', val: 'Auto' },
  { l: 'Units', s: 'Weight, height', val: 'Metric' },
  { l: 'Language', s: '', val: 'English' },
  { l: 'Data & privacy', s: 'Export, delete', val: '' },
];

export function SettingsScreen() {
  return (
    <div className="screen-content">
      <div style={{ padding: '10px 24px 0' }}>
        <div className="mono">settings</div>
        <h1
          style={{
            fontFamily: 'Geist, sans-serif',
            fontWeight: 300,
            fontSize: 38,
            margin: '4px 0 0',
            letterSpacing: -1,
            color: 'var(--text)',
          }}
        >
          Your{' '}
          <em className="serif" style={{ color: 'var(--accent)' }}>
            setup.
          </em>
        </h1>
      </div>

      <SectionLabel>baby</SectionLabel>
      <div style={{ padding: '0 20px' }}>
        <div className="card" style={{ padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent), #D47860)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#0a0706',
              fontFamily: 'Instrument Serif, serif',
              fontSize: 22,
              fontStyle: 'italic',
            }}
          >
            I
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 15, fontWeight: 500, color: 'var(--text)' }}>Inna</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Born Dec 17, 2025 · 4 months</div>
          </div>
          <Icon.Arrow />
        </div>
      </div>

      <SectionLabel>preferences</SectionLabel>
      <div style={{ padding: '0 20px' }}>
        <div className="card" style={{ padding: 0 }}>
          {PREFS.map((r, i, a) => (
            <div
              key={i}
              style={{
                padding: '14px 16px',
                borderBottom: i < a.length - 1 ? '0.5px solid var(--line)' : 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div>
                <div style={{ fontSize: 14, color: 'var(--text)' }}>{r.l}</div>
                {r.s && (
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>{r.s}</div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div className="mono" style={{ textTransform: 'none' }}>{r.val}</div>
                <div style={{ color: 'var(--text-3)' }}>
                  <Icon.Arrow />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ padding: '20px', textAlign: 'center' }}>
        <div className="serif italic" style={{ fontSize: 14, color: 'var(--text-3)' }}>
          v4.2 · thanks for caring.
        </div>
      </div>
    </div>
  );
}

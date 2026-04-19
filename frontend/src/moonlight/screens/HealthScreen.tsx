import { Spark } from '../components/Charts';
import { SectionLabel } from '../components/UI';

type VaxState = 'done' | 'upcoming' | 'future';
type VaxRow = { age: string; state: VaxState; vaccines: string[] };

const VAX: VaxRow[] = [
  { age: 'Birth', state: 'done', vaccines: ['Hep B'] },
  { age: '2 Months', state: 'done', vaccines: ['DTaP', 'Pneu-C', 'RV'] },
  { age: '4 Months', state: 'done', vaccines: ['DTaP', 'Pneu-C', 'RV'] },
  { age: '6 Months', state: 'upcoming', vaccines: ['DTaP', 'Influenza'] },
  { age: '12 Months', state: 'future', vaccines: ['MMR', 'Men-C', '+2'] },
];

const GROWTH = [
  { l: 'Weight', v: '7.1', u: 'kg', p: '75th' },
  { l: 'Height', v: '65.0', u: 'cm', p: '90th' },
  { l: 'Head', v: '—', u: '', p: '—' },
];

const VISITS = [
  { d: 'Apr 16', dr: 'Dr. Rebecca', n: 'Vaccination · 7.1 kg · cried a lot' },
  { d: 'Feb 18', dr: 'Dr. Rebecca', n: 'Vaccination · 5.5 kg' },
  { d: 'Jan 29', dr: 'Dr. Rebecca', n: 'Checkup · head 36 cm' },
];

function vaxColor(state: VaxState) {
  return state === 'done' ? '#9BC29E' : state === 'upcoming' ? 'var(--accent)' : 'var(--text-3)';
}

export function HealthScreen() {
  return (
    <div className="screen-content">
      <div style={{ padding: '10px 24px 0' }}>
        <div className="mono">health</div>
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
          Growing{' '}
          <em className="serif" style={{ color: 'var(--accent)' }}>
            steady.
          </em>
        </h1>
      </div>

      <div style={{ padding: '16px 20px 0' }}>
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <div className="mono">growth · 4m</div>
            <div className="mono" style={{ color: 'var(--accent)' }}>WHO</div>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 10,
              marginTop: 14,
            }}
          >
            {GROWTH.map((m, i) => (
              <div key={i}>
                <div className="mono" style={{ fontSize: 9 }}>{m.l}</div>
                <div
                  style={{
                    fontFamily: 'Geist, sans-serif',
                    fontSize: 22,
                    fontWeight: 300,
                    color: 'var(--text)',
                    marginTop: 2,
                  }}
                >
                  {m.v}
                  <span style={{ fontSize: 12, color: 'var(--text-2)' }}> {m.u}</span>
                </div>
                <div
                  style={{
                    fontSize: 10,
                    color: 'var(--text-3)',
                    fontStyle: 'italic',
                    fontFamily: 'Instrument Serif, serif',
                  }}
                >
                  {m.p}
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16 }}>
            <Spark
              data={[3.2, 3.8, 4.3, 4.8, 5.4, 5.9, 6.3, 6.6, 6.9, 7.1]}
              color="var(--accent)"
              w={330}
              h={50}
            />
          </div>
        </div>
      </div>

      <SectionLabel extra="7/15">vaccinations</SectionLabel>
      <div style={{ padding: '0 20px' }}>
        <div className="card">
          <div
            style={{
              height: 6,
              borderRadius: 3,
              background: 'var(--surface-2)',
              overflow: 'hidden',
              marginBottom: 14,
            }}
          >
            <div style={{ height: '100%', width: '47%', background: 'var(--accent)', borderRadius: 3 }} />
          </div>
          {VAX.map((r, i) => {
            const c = vaxColor(r.state);
            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 0',
                  borderTop: i ? '0.5px solid var(--line)' : 'none',
                }}
              >
                <div style={{ width: 4, height: 32, borderRadius: 2, background: c }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--text)' }}>{r.age}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-2)', marginTop: 2 }}>
                    {r.vaccines.join(' · ')}
                  </div>
                </div>
                <div
                  style={{
                    fontFamily: 'Geist Mono, monospace',
                    fontSize: 10,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    color: c,
                  }}
                >
                  {r.state}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <SectionLabel>last visits</SectionLabel>
      <div style={{ padding: '0 20px 20px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {VISITS.map((v, i) => (
          <div key={i} className="card" style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div className="mono">{v.d}</div>
              <div className="serif italic" style={{ fontSize: 12, color: 'var(--text-2)' }}>{v.dr}</div>
            </div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginTop: 4 }}>{v.n}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

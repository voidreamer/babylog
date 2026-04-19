import { Ribbon } from '../components/Ribbon';
import { SectionLabel } from '../components/UI';
import { EVENT_COLORS, TODAY } from '../data';
import type { TimelineEvent } from '../types';

export function TimelineScreen() {
  const HOURS = Array.from({ length: 18 }, (_, i) => i + 6);
  const blocksByHour: Record<number, TimelineEvent[]> = {};
  TODAY.forEach((e) => {
    const h = Math.floor(e.t);
    blocksByHour[h] = blocksByHour[h] || [];
    blocksByHour[h].push(e);
  });

  return (
    <div className="screen-content">
      <div style={{ padding: '10px 24px 0' }}>
        <div className="mono">saturday · april 18</div>
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
          Today at a{' '}
          <em className="serif" style={{ color: 'var(--accent)' }}>
            glance
          </em>
        </h1>
      </div>

      <div style={{ padding: '18px 20px 0' }}>
        <Ribbon events={TODAY} />
        <div
          style={{
            display: 'flex',
            gap: 14,
            marginTop: 10,
            fontFamily: 'Geist Mono, monospace',
            fontSize: 10,
            color: 'var(--text-2)',
          }}
        >
          {(
            [
              ['sleep', EVENT_COLORS.sleep],
              ['feed', EVENT_COLORS.feed],
              ['diaper', EVENT_COLORS.diaper],
              ['play', EVENT_COLORS.play],
            ] as const
          ).map(([l, c]) => (
            <span key={l} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, background: c, borderRadius: 3 }} />
              {l}
            </span>
          ))}
        </div>
      </div>

      <SectionLabel>hour by hour</SectionLabel>
      <div style={{ padding: '0 20px' }}>
        {HOURS.slice().reverse().map((h) => {
          const label = h === 0 ? '12am' : h < 12 ? `${h}am` : h === 12 ? '12pm' : `${h - 12}pm`;
          const events = blocksByHour[h] || [];
          const isNow = h === 13;
          return (
            <div
              key={h}
              style={{
                display: 'flex',
                gap: 14,
                padding: '10px 0',
                borderTop: '0.5px solid var(--line)',
              }}
            >
              <div
                style={{
                  width: 48,
                  flexShrink: 0,
                  paddingTop: 2,
                  fontFamily: 'Geist Mono, monospace',
                  fontSize: 11,
                  color: isNow ? 'var(--accent)' : 'var(--text-3)',
                  letterSpacing: 0.4,
                }}
              >
                {label}
                {isNow && (
                  <div
                    style={{
                      fontSize: 9,
                      marginTop: 2,
                      letterSpacing: 1.2,
                      textTransform: 'uppercase',
                    }}
                  >
                    now
                  </div>
                )}
              </div>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {events.length === 0 ? (
                  <div
                    style={{
                      fontFamily: 'Instrument Serif, serif',
                      fontStyle: 'italic',
                      fontSize: 13,
                      color: 'var(--text-3)',
                      paddingTop: 2,
                    }}
                  >
                    —
                  </div>
                ) : (
                  events.map((e, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 12,
                        background: EVENT_COLORS[e.type] + '22',
                        border: `0.5px solid ${EVENT_COLORS[e.type]}44`,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            color: 'var(--text)',
                            textTransform: 'capitalize',
                          }}
                        >
                          {e.type}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
                          {Math.round(e.duration * 60)} min
                        </div>
                      </div>
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: '50%',
                          background: EVENT_COLORS[e.type],
                        }}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

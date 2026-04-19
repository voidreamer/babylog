import { EVENT_COLORS } from '../data';
import type { TimelineEvent } from '../types';

type RibbonProps = {
  events: TimelineEvent[];
  compact?: boolean;
  nowFrac?: number;
};

export function Ribbon({ events, compact = false, nowFrac = 0.58 }: RibbonProps) {
  return (
    <div
      style={{
        position: 'relative',
        height: compact ? 44 : 56,
        borderRadius: 14,
        background: 'var(--surface)',
        overflow: 'hidden',
        padding: '6px 0',
      }}
    >
      {[0, 6, 12, 18].map((h) => (
        <div
          key={h}
          style={{
            position: 'absolute',
            left: `${(h / 24) * 100}%`,
            top: 0,
            bottom: 0,
            width: 1,
            background: 'var(--line)',
          }}
        />
      ))}
      {events.map((e, i) => {
        const l = (e.t / 24) * 100;
        const w = (e.duration / 24) * 100;
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: `${l}%`,
              width: `${Math.max(w, 1.2)}%`,
              top: compact ? 8 : 10,
              bottom: compact ? 8 : 10,
              background: EVENT_COLORS[e.type],
              borderRadius: 6,
              boxShadow: `0 0 0 2px ${EVENT_COLORS[e.type]}22`,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: `${nowFrac * 100}%`,
          top: -2,
          bottom: -2,
          width: 2,
          background: 'var(--text)',
          borderRadius: 2,
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: -3,
            left: -3,
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: 'var(--text)',
          }}
        />
      </div>
    </div>
  );
}

import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  type TouchEvent,
} from 'react';
import type { OrbMode } from './types';

type OrbProps = {
  size?: number;
  mode?: OrbMode;
  urgency?: number;
  onPress?: () => void;
  onLongPress?: () => void;
  ariaLabel?: string;
  /** Raster asset drawn inside the orb (e.g. production sleep2.png). Takes precedence over iconNode. */
  iconSrc?: string;
  /** JSX drawn inside the orb (e.g. <BabyFace mood="calm" />). Ignored if iconSrc is set. */
  iconNode?: ReactNode;
  /** Icon scale relative to the orb, 0..1. Default 0.45. */
  iconScale?: number;
};

type Palette = [string, string, string];

const PALETTES: Record<OrbMode, Palette> = {
  calm: ['#E8A398', '#F7D4C5', '#FFEBDC'],
  sleepy: ['#8BA5C4', '#B4C3D6', '#DCE4EE'],
  alert: ['#E8A564', '#F3C892', '#FCE5C4'],
  hungry: ['#D98571', '#EBA992', '#F7CFB7'],
  content: ['#9BC29E', '#C0D8C2', '#E2EDE3'],
};

const LONG_PRESS_MS = 550;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return reduced;
}

export function Orb({
  size = 160,
  mode = 'calm',
  urgency = 0.3,
  onPress,
  onLongPress,
  ariaLabel,
  iconSrc,
  iconNode,
  iconScale = 0.45,
}: OrbProps) {
  const reduced = usePrefersReducedMotion();
  const [t, setT] = useState(0);
  const [pressed, setPressed] = useState(false);
  const [holding, setHolding] = useState(0);
  const holdRaf = useRef<number | null>(null);
  const holdStart = useRef(0);

  useEffect(() => {
    if (reduced) return;
    let raf: number;
    const start = performance.now();
    const loop = () => {
      setT((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [reduced]);

  const speed = 0.5 + urgency * 2.0;
  const amp = reduced ? 0 : 0.04 + urgency * 0.08;
  const breath = reduced ? 0.5 : (Math.sin(t * speed) + 1) / 2;
  const scale = 1 + breath * amp + (pressed ? -0.04 : 0) + holding * 0.04;

  const [c1, c2, c3] = PALETTES[mode] || PALETTES.calm;

  const startPress = () => {
    if (!onLongPress) {
      setPressed(true);
      return;
    }
    setPressed(true);
    holdStart.current = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - holdStart.current) / LONG_PRESS_MS);
      setHolding(p);
      if (p < 1) {
        holdRaf.current = requestAnimationFrame(tick);
      } else {
        if (holdRaf.current) cancelAnimationFrame(holdRaf.current);
        onLongPress();
        setPressed(false);
        setHolding(0);
      }
    };
    holdRaf.current = requestAnimationFrame(tick);
  };

  const endPress = (wasTap: boolean) => {
    if (holdRaf.current) cancelAnimationFrame(holdRaf.current);
    if (wasTap && holding < 0.4 && pressed) onPress?.();
    setPressed(false);
    setHolding(0);
  };

  const interactive = !!(onPress || onLongPress);

  const handleMouseDown = (_e: MouseEvent) => startPress();
  const handleMouseUp = (_e: MouseEvent) => endPress(true);
  const handleMouseLeave = (_e: MouseEvent) => endPress(false);
  const handleTouchStart = (_e: TouchEvent) => startPress();
  const handleTouchEnd = (_e: TouchEvent) => endPress(true);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPress?.();
    }
  };

  const role = interactive ? 'button' : undefined;
  const tabIndex = interactive ? 0 : undefined;

  return (
    <div
      role={role}
      tabIndex={tabIndex}
      aria-label={interactive ? ariaLabel ?? 'Orb' : undefined}
      onMouseDown={interactive ? handleMouseDown : undefined}
      onMouseUp={interactive ? handleMouseUp : undefined}
      onMouseLeave={interactive ? handleMouseLeave : undefined}
      onTouchStart={interactive ? handleTouchStart : undefined}
      onTouchEnd={interactive ? handleTouchEnd : undefined}
      onKeyDown={interactive ? handleKeyDown : undefined}
      style={{
        width: size,
        height: size,
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: interactive ? 'pointer' : 'default',
        userSelect: 'none',
        WebkitUserSelect: 'none',
      }}
    >
      <div
        style={{
          position: 'absolute',
          width: size,
          height: size,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${c1}55 0%, ${c2}22 40%, transparent 70%)`,
          transform: `scale(${1 + breath * (0.12 + urgency * 0.15) + holding * 0.08})`,
          filter: 'blur(12px)',
          transition: 'filter 0.2s',
        }}
      />
      <div
        style={{
          position: 'absolute',
          width: size * 0.82,
          height: size * 0.82,
          borderRadius: '50%',
          background: `radial-gradient(circle at 30% 30%, ${c3}, ${c2} 50%, ${c1} 100%)`,
          transform: `scale(${scale})`,
          boxShadow: `inset -10px -15px 40px ${c1}88, inset 8px 10px 30px ${c3}aa, 0 8px 24px ${c1}${
            holding > 0 ? 'cc' : '44'
          }`,
          transition: 'box-shadow 0.2s',
        }}
      />
      {(iconSrc || iconNode) && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            width: size * iconScale,
            height: size * iconScale,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${scale})`,
            pointerEvents: 'none',
          }}
        >
          {iconSrc ? (
            <img
              src={iconSrc}
              alt=""
              draggable={false}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                borderRadius: '50%',
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
            />
          ) : (
            iconNode
          )}
        </div>
      )}
      <div
        style={{
          position: 'absolute',
          width: size * 0.35,
          height: size * 0.35,
          borderRadius: '50%',
          top: size * 0.18,
          left: size * 0.22,
          background: 'radial-gradient(circle, #ffffffaa, transparent 70%)',
          transform: `scale(${scale})`,
          filter: 'blur(6px)',
        }}
      />
      {holding > 0 && (
        <svg
          width={size}
          height={size}
          aria-hidden="true"
          style={{ position: 'absolute', transform: 'rotate(-90deg)' }}
        >
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size * 0.44}
            fill="none"
            stroke={c1}
            strokeWidth="2"
            strokeDasharray={size * 0.44 * 2 * Math.PI}
            strokeDashoffset={size * 0.44 * 2 * Math.PI * (1 - holding)}
            strokeLinecap="round"
            opacity="0.9"
          />
        </svg>
      )}
    </div>
  );
}

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from 'react';

type HoldButtonProps = {
  onHold: () => void;
  holdMs?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  ariaLabel: string;
  borderRadius?: number;
  disabled?: boolean;
};

/**
 * Card-shaped press-and-hold button.
 *
 * Pointer + touch: press and hold for `holdMs` (default 500). A coral outline
 * sweeps around the perimeter as progress accumulates; on completion `onHold`
 * fires and progress resets. Releasing early cancels.
 *
 * Keyboard: Enter/Space on a focused card fires `onHold` immediately — no hold
 * gesture is required because keyboard users can't trivially press-and-hold.
 *
 * prefers-reduced-motion: no sweeping outline; a static ring fades in during
 * the hold so the gesture still gives feedback without animation.
 *
 * Nested <button> / <a> children should call e.stopPropagation() in their
 * onPointerDown handlers so chip taps don't trigger the parent hold.
 */
export function HoldButton({
  onHold,
  holdMs = 500,
  children,
  className,
  style,
  ariaLabel,
  borderRadius = 22,
  disabled,
}: HoldButtonProps) {
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const [size, setSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const raf = useRef<number | null>(null);
  const holdStart = useRef(0);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const h = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', h);
    return () => mq.removeEventListener('change', h);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        setSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (raf.current) cancelAnimationFrame(raf.current);
    };
  }, []);

  const start = () => {
    if (disabled) return;
    setHolding(true);
    holdStart.current = performance.now();
    const tick = () => {
      const p = Math.min(1, (performance.now() - holdStart.current) / holdMs);
      setProgress(p);
      if (p < 1) {
        raf.current = requestAnimationFrame(tick);
      } else {
        if (raf.current) cancelAnimationFrame(raf.current);
        setHolding(false);
        setProgress(0);
        onHold();
      }
    };
    raf.current = requestAnimationFrame(tick);
  };

  const cancel = () => {
    if (raf.current) cancelAnimationFrame(raf.current);
    if (holding) {
      setHolding(false);
      setProgress(0);
    }
  };

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (disabled) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    start();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;
    if (e.repeat) return;
    e.preventDefault();
    onHold();
  };

  const showSweep = holding && !reducedMotion && size.w > 0 && size.h > 0;

  return (
    <div
      ref={containerRef}
      role="button"
      aria-label={ariaLabel}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : 0}
      onPointerDown={onPointerDown}
      onPointerUp={cancel}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={onKeyDown}
      className={className}
      style={{
        position: 'relative',
        cursor: disabled ? 'not-allowed' : 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        transform: holding ? `scale(${1 - progress * 0.01})` : 'scale(1)',
        transition: holding ? 'none' : 'transform 150ms',
        outlineOffset: 3,
        ...style,
      }}
    >
      {children}
      {showSweep && (
        <svg
          aria-hidden="true"
          width={size.w}
          height={size.h}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
          }}
        >
          <rect
            x={1}
            y={1}
            width={Math.max(0, size.w - 2)}
            height={Math.max(0, size.h - 2)}
            rx={borderRadius}
            ry={borderRadius}
            fill="none"
            stroke="var(--ml-accent)"
            strokeWidth={2}
            strokeLinecap="round"
            pathLength={1}
            strokeDasharray="1 1"
            strokeDashoffset={1 - progress}
          />
        </svg>
      )}
      {holding && reducedMotion && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            border: '2px solid var(--ml-accent)',
            borderRadius,
            opacity: progress,
          }}
        />
      )}
    </div>
  );
}

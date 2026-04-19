/**
 * Minimalist baby-face placeholders for the Orb's inner icon slot.
 *
 * Intentionally abstract and monochrome so they read as placeholders that will
 * be replaced by real artwork per-mood later. Uses currentColor so the caller
 * controls tint via an outer wrapper.
 *
 * Layout is a 64-unit viewBox; re-sizes freely via width/height="100%".
 */

type Mood = 'calm' | 'content' | 'alert' | 'hungry';

type BabyFaceProps = {
  mood: Mood;
  stroke?: string;
  strokeWidth?: number;
};

export function BabyFace({ mood, stroke = 'currentColor', strokeWidth = 2 }: BabyFaceProps) {
  const common = {
    stroke,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none',
  };

  // All faces share the same outer round face outline; eyes + mouth differ.
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 64 64"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden="true"
    >
      {/* Face outline — soft head + chin hint */}
      <circle cx="32" cy="32" r="22" {...common} opacity="0.55" />

      {mood === 'calm' && (
        <>
          {/* Closed gentle eyes — downward arcs */}
          <path d="M22 28 q3 3 6 0" {...common} />
          <path d="M36 28 q3 3 6 0" {...common} />
          {/* Relaxed, nearly flat smile */}
          <path d="M26 40 q6 3 12 0" {...common} opacity="0.8" />
        </>
      )}

      {mood === 'content' && (
        <>
          {/* Squinting happy eyes — upward arcs */}
          <path d="M22 30 q3 -3 6 0" {...common} />
          <path d="M36 30 q3 -3 6 0" {...common} />
          {/* Soft smile */}
          <path d="M24 39 q8 5 16 0" {...common} />
        </>
      )}

      {mood === 'alert' && (
        <>
          {/* Wide round eyes */}
          <circle cx="25" cy="29" r="2" fill={stroke} opacity="0.9" />
          <circle cx="39" cy="29" r="2" fill={stroke} opacity="0.9" />
          {/* Neutral small mouth */}
          <path d="M28 40 l8 0" {...common} opacity="0.8" />
        </>
      )}

      {mood === 'hungry' && (
        <>
          {/* Round attentive eyes */}
          <circle cx="25" cy="29" r="1.8" fill={stroke} opacity="0.9" />
          <circle cx="39" cy="29" r="1.8" fill={stroke} opacity="0.9" />
          {/* Small open "o" mouth */}
          <circle cx="32" cy="41" r="2.5" {...common} />
        </>
      )}
    </svg>
  );
}

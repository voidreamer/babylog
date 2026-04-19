type SparkProps = {
  data: number[];
  color: string;
  w?: number;
  h?: number;
  filled?: boolean;
};

export function Spark({ data, color, w = 80, h = 32, filled = true }: SparkProps) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const rng = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / rng) * (h - 4) - 2;
    return [x, y] as const;
  });
  const line = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join(' ');
  const last = pts[pts.length - 1];
  return (
    <svg width={w} height={h} style={{ display: 'block' }} aria-hidden="true">
      {filled && <path d={`${line} L${w},${h} L0,${h} Z`} fill={color} opacity="0.15" />}
      <path
        d={line}
        stroke={color}
        strokeWidth="1.8"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last[0]} cy={last[1]} r="2.5" fill={color} />
    </svg>
  );
}

type BarsProps = {
  data: number[];
  highlightAfter?: number;
  color: string;
  h?: number;
};

export function Bars({ data, highlightAfter = -1, color, h = 56 }: BarsProps) {
  const max = Math.max(...data);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: h }} aria-hidden="true">
      {data.map((v, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${(v / max) * 100}%`,
            background: i > highlightAfter ? color : 'var(--ml-surface-2)',
            borderRadius: 2,
          }}
        />
      ))}
    </div>
  );
}

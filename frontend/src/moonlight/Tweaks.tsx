import type { AccentKey, Density, Mode, Motion, Tweaks as TweaksState } from './types';

const ACCENT_META: Record<AccentKey, { name: string; hex: string }> = {
  coral: { name: 'Coral', hex: '#E89580' },
  sage: { name: 'Sage', hex: '#9BC29E' },
  lavender: { name: 'Lavender', hex: '#B498D1' },
  amber: { name: 'Amber', hex: '#E8B464' },
  blue: { name: 'Blue', hex: '#8BA5C4' },
};

export const ACCENT_HEX: Record<AccentKey, string> = Object.fromEntries(
  Object.entries(ACCENT_META).map(([k, v]) => [k, v.hex])
) as Record<AccentKey, string>;

type Props = {
  state: TweaksState;
  onChange: (partial: Partial<TweaksState>) => void;
};

function cap(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

export function TweaksPanel({ state, onChange }: Props) {
  return (
    <div className="tweaks">
      <h3>Tweaks</h3>
      <div className="sub">Moonlight controls</div>

      <div className="tw-row">
        <label>
          Mode <span>{cap(state.mode)}</span>
        </label>
        <div className="opts">
          {(['night', 'day'] as Mode[]).map((k) => (
            <button
              type="button"
              key={k}
              className={`opt ${state.mode === k ? 'active' : ''}`}
              onClick={() => onChange({ mode: k })}
            >
              {cap(k)}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-row">
        <label>
          Accent <span>{ACCENT_META[state.accent].name}</span>
        </label>
        <div className="swatches">
          {(Object.keys(ACCENT_META) as AccentKey[]).map((k) => (
            <button
              type="button"
              key={k}
              className={`swatch ${state.accent === k ? 'active' : ''}`}
              style={{ background: ACCENT_META[k].hex }}
              title={ACCENT_META[k].name}
              onClick={() => onChange({ accent: k })}
            />
          ))}
        </div>
      </div>

      <div className="tw-row">
        <label>
          Density <span>{cap(state.density)}</span>
        </label>
        <div className="opts">
          {(['compact', 'cozy', 'spacious'] as Density[]).map((k) => (
            <button
              type="button"
              key={k}
              className={`opt ${state.density === k ? 'active' : ''}`}
              onClick={() => onChange({ density: k })}
            >
              {cap(k)}
            </button>
          ))}
        </div>
      </div>

      <div className="tw-row">
        <label>
          Motion <span>{cap(state.motion)}</span>
        </label>
        <div className="opts">
          {(['on', 'off'] as Motion[]).map((k) => (
            <button
              type="button"
              key={k}
              className={`opt ${state.motion === k ? 'active' : ''}`}
              onClick={() => onChange({ motion: k })}
            >
              {cap(k)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

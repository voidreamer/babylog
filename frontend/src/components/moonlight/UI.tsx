import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

type SectionLabelProps = {
  children: ReactNode;
  extra?: ReactNode;
};

export function SectionLabel({ children, extra }: SectionLabelProps) {
  // No horizontal padding: every caller renders inside an already-padded
  // page, so padding here pushed labels 20px out of line with their cards.
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        marginTop: 24,
        marginBottom: 10,
      }}
    >
      <div className="mono">{children}</div>
      {extra && (
        <div className="mono" style={{ opacity: 0.7 }}>
          {extra}
        </div>
      )}
    </div>
  );
}

type BtnProps = {
  children: ReactNode;
  onClick?: () => void;
  style?: CSSProperties;
  icon?: boolean | ReactNode;
  type?: 'button' | 'submit';
  disabled?: boolean;
  ariaLabel?: string;
};

export function PrimaryBtn({
  children,
  onClick,
  style = {},
  icon,
  type = 'button',
  disabled,
  ariaLabel,
}: BtnProps) {
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        height: 56,
        borderRadius: 999,
        padding: '0 24px',
        background: 'var(--ml-accent)',
        color: '#0a0706',
        border: 'none',
        fontFamily: 'Geist Variable, Geist, -apple-system, sans-serif',
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: 0.2,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...style,
      }}
    >
      {children}
      {icon === true ? <Icon.Arrow /> : icon}
    </button>
  );
}

export function GhostBtn({
  children,
  onClick,
  style = {},
  icon,
  type = 'button',
  disabled,
  ariaLabel,
}: BtnProps) {
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      aria-label={ariaLabel}
      style={{
        height: 56,
        borderRadius: 999,
        padding: '0 20px',
        background: 'var(--ml-surface)',
        color: 'var(--ml-text)',
        border: '0.5px solid var(--ml-line)',
        fontFamily: 'Geist Variable, Geist, -apple-system, sans-serif',
        fontSize: 15,
        fontWeight: 500,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

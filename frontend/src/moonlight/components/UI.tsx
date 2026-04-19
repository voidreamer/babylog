import type { CSSProperties, ReactNode } from 'react';
import { Icon } from './Icon';

type SectionLabelProps = {
  children: ReactNode;
  extra?: ReactNode;
};

export function SectionLabel({ children, extra }: SectionLabelProps) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        padding: '0 20px',
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
};

export function PrimaryBtn({ children, onClick, style = {}, icon }: BtnProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        height: 56,
        borderRadius: 999,
        padding: '0 24px',
        background: 'var(--accent)',
        color: '#0a0706',
        border: 'none',
        fontFamily: 'Geist, sans-serif',
        fontSize: 16,
        fontWeight: 600,
        letterSpacing: 0.2,
        cursor: 'pointer',
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

export function GhostBtn({ children, onClick, style = {}, icon }: BtnProps) {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        height: 56,
        borderRadius: 999,
        padding: '0 20px',
        background: 'var(--surface)',
        color: 'var(--text)',
        border: '0.5px solid var(--line)',
        fontFamily: 'Geist, sans-serif',
        fontSize: 15,
        fontWeight: 500,
        cursor: 'pointer',
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

import type { ReactElement } from 'react';
import { Icon } from './Icon';
import type { TabKey } from './types';

type TabBarProps = {
  active: TabKey;
  onChange: (k: TabKey) => void;
  labels?: Partial<Record<TabKey, string>>;
};

const TABS: { k: TabKey; fallback: string; Component: () => ReactElement }[] = [
  { k: 'home', fallback: 'Home', Component: Icon.Home },
  { k: 'timeline', fallback: 'Timeline', Component: Icon.Timeline },
  { k: 'health', fallback: 'Health', Component: Icon.Health },
  { k: 'insights', fallback: 'Insights', Component: Icon.Insights },
  { k: 'settings', fallback: 'Settings', Component: Icon.Settings },
];

export function TabBar({ active, onChange, labels }: TabBarProps) {
  return (
    <nav className="ml-tabbar" aria-label="Primary">
      {TABS.map((t) => {
        const label = labels?.[t.k] ?? t.fallback;
        const isActive = t.k === active;
        return (
          <button
            key={t.k}
            className={`ml-tab${isActive ? ' is-active' : ''}`}
            onClick={() => onChange(t.k)}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={label}
          >
            <t.Component />
            <span className="ml-tab-label">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}

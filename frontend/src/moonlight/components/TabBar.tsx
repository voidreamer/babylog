import type { ReactElement } from 'react';
import { Icon } from './Icon';
import type { TabKey } from '../types';

type TabBarProps = {
  active: TabKey;
  onChange: (k: TabKey) => void;
};

const TABS: { k: TabKey; label: string; Component: () => ReactElement }[] = [
  { k: 'home', label: 'Home', Component: Icon.Home },
  { k: 'timeline', label: 'Timeline', Component: Icon.Timeline },
  { k: 'health', label: 'Health', Component: Icon.Health },
  { k: 'insights', label: 'Insights', Component: Icon.Insights },
  { k: 'settings', label: 'Settings', Component: Icon.Settings },
];

export function TabBar({ active, onChange }: TabBarProps) {
  return (
    <div className="phone-nav">
      {TABS.map((t) => (
        <button
          key={t.k}
          className={`tab ${t.k === active ? 'active' : ''}`}
          onClick={() => onChange(t.k)}
          type="button"
        >
          <t.Component />
          <div className="tab-label">{t.label}</div>
        </button>
      ))}
    </div>
  );
}

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './moonlight.css';
import { ACCENT_HEX, TweaksPanel } from './Tweaks';
import { TabBar } from './components/TabBar';
import { HomeScreen } from './screens/HomeScreen';
import { BubsenseScreen } from './screens/BubsenseScreen';
import { FeedTimerScreen } from './screens/FeedTimerScreen';
import { TimelineScreen } from './screens/TimelineScreen';
import { HealthScreen } from './screens/HealthScreen';
import { InsightsScreen } from './screens/InsightsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { OnboardingScreen } from './screens/OnboardingScreen';
import { QuickLogScreen } from './screens/QuickLogScreen';
import type {
  AppCtx,
  GoFn,
  QuickLogKind,
  ScreenKey,
  ScreenParams,
  TabKey,
  Tweaks as TweaksState,
} from './types';

type ScreenDef = {
  k: ScreenKey;
  label: string;
  hasTab: boolean;
  tab?: TabKey;
};

const SCREENS: ScreenDef[] = [
  { k: 'onboarding', label: 'Onboarding', hasTab: false },
  { k: 'home', label: 'Dashboard', hasTab: true, tab: 'home' },
  { k: 'bubsense', label: 'Ask bubsense', hasTab: false },
  { k: 'feed-timer', label: 'Active feed', hasTab: false },
  { k: 'timeline', label: 'Timeline', hasTab: true, tab: 'timeline' },
  { k: 'health', label: 'Health', hasTab: true, tab: 'health' },
  { k: 'insights', label: 'Insights', hasTab: true, tab: 'insights' },
  { k: 'settings', label: 'Settings', hasTab: true, tab: 'settings' },
  { k: 'quick-log', label: 'Quick log', hasTab: false },
];

const DEFAULT_TWEAKS: TweaksState = {
  mode: 'night',
  accent: 'coral',
  density: 'cozy',
  motion: 'on',
};

function loadInitialScreen(): ScreenKey {
  if (typeof window === 'undefined') return 'home';
  const stored = window.localStorage.getItem('moonlight.screen') as ScreenKey | null;
  return stored && SCREENS.some((s) => s.k === stored) ? stored : 'home';
}

export default function Moonlight() {
  const [screen, setScreen] = useState<ScreenKey>(loadInitialScreen);
  const [params, setParams] = useState<ScreenParams>({});
  const [toastMsg, setToastMsg] = useState('');
  const [tweaks, setTweaks] = useState<TweaksState>(DEFAULT_TWEAKS);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const ctx = useMemo<AppCtx>(() => ({ clock: '3:18', nowMin: 14 * 60 + 6 }), []);
  const lastFeed = 12 * 60 + 6;

  useEffect(() => {
    try {
      window.localStorage.setItem('moonlight.screen', screen);
    } catch {
      // ignore
    }
  }, [screen]);

  useEffect(() => {
    return () => {
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, []);

  const go: GoFn = useCallback((s, p = {}) => {
    setScreen(s);
    setParams(p);
  }, []);

  const toast = useCallback((msg: string) => {
    setToastMsg(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToastMsg(''), 2000);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      const i = SCREENS.findIndex((s) => s.k === screen);
      if (i < 0) return;
      if (e.key === 'ArrowRight') go(SCREENS[(i + 1) % SCREENS.length].k);
      else if (e.key === 'ArrowLeft') go(SCREENS[(i - 1 + SCREENS.length) % SCREENS.length].k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [screen, go]);

  // Apply tweak CSS vars to the moonlight root
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.setProperty('--accent', ACCENT_HEX[tweaks.accent]);
    el.classList.toggle('day', tweaks.mode === 'day');
    el.classList.toggle('motion-off', tweaks.motion === 'off');
  }, [tweaks]);

  const currentTab = SCREENS.find((s) => s.k === screen)?.tab;

  const onTabChange = (tab: TabKey) => {
    const match = SCREENS.find((s) => s.tab === tab);
    if (match) go(match.k);
  };

  const updateTweaks = (partial: Partial<TweaksState>) => {
    setTweaks((prev) => ({ ...prev, ...partial }));
  };

  const renderScreen = (k: ScreenKey) => {
    if (k !== screen) return null;
    switch (k) {
      case 'onboarding':
        return <OnboardingScreen go={go} toast={toast} />;
      case 'home':
        return <HomeScreen go={go} toast={toast} ctx={ctx} lastFeed={lastFeed} />;
      case 'bubsense':
        return (
          <BubsenseScreen
            go={go}
            toast={toast}
            ctx={ctx}
            lastFeed={lastFeed}
            startMode={params.mode}
          />
        );
      case 'feed-timer':
        return <FeedTimerScreen go={go} toast={toast} />;
      case 'timeline':
        return <TimelineScreen />;
      case 'health':
        return <HealthScreen />;
      case 'insights':
        return <InsightsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'quick-log':
        return (
          <QuickLogScreen
            go={go}
            toast={toast}
            kind={(params.kind as QuickLogKind) || 'diaper'}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div ref={rootRef} className="moonlight">
      <div className="stage-wrap">
        <div className="sidebar">
          <div className="label">heybub · moonlight</div>
          <h1>
            Tap <em>through</em> it.
          </h1>
          <p>Clickable prototype of the core loop — open → predict → log → review.</p>
          <div className="jump-list">
            {SCREENS.map((s, i) => (
              <button
                type="button"
                key={s.k}
                className={`jump ${screen === s.k ? 'active' : ''}`}
                onClick={() => go(s.k)}
              >
                <span>{s.label}</span>
                <span className="k">{i + 1}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="phone-frame">
          <div className="island" />
          <div className="status">
            <span>{ctx.clock}</span>
            <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <svg width="18" height="11" viewBox="0 0 19 12">
                <rect x="0" y="7.5" width="3.2" height="4.5" rx="0.7" fill="currentColor" />
                <rect x="4.8" y="5" width="3.2" height="7" rx="0.7" fill="currentColor" />
                <rect x="9.6" y="2.5" width="3.2" height="9.5" rx="0.7" fill="currentColor" />
                <rect x="14.4" y="0" width="3.2" height="12" rx="0.7" fill="currentColor" />
              </svg>
              <svg width="16" height="11" viewBox="0 0 17 12">
                <path
                  d="M8.5 3.2C10.8 3.2 12.9 4.1 14.4 5.6L15.5 4.5C13.7 2.7 11.2 1.5 8.5 1.5C5.8 1.5 3.3 2.7 1.5 4.5L2.6 5.6C4.1 4.1 6.2 3.2 8.5 3.2Z"
                  fill="currentColor"
                />
                <circle cx="8.5" cy="10.5" r="1.5" fill="currentColor" />
              </svg>
              <svg width="25" height="12" viewBox="0 0 27 13">
                <rect
                  x="0.5"
                  y="0.5"
                  width="23"
                  height="12"
                  rx="3.5"
                  stroke="currentColor"
                  strokeOpacity="0.4"
                  fill="none"
                />
                <rect x="2" y="2" width="18" height="9" rx="2" fill="currentColor" />
              </svg>
            </span>
          </div>

          <div className={`toast ${toastMsg ? 'show' : ''}`}>{toastMsg && `✓ ${toastMsg}`}</div>

          {SCREENS.map((s) => (
            <div key={s.k} className={`screen ${screen === s.k ? 'active' : ''}`}>
              {renderScreen(s.k)}
            </div>
          ))}

          {currentTab && <TabBar active={currentTab} onChange={onTabChange} />}
          <div className="home-ind" />
        </div>
      </div>

      <div className="kbd-hint">← → keys to navigate</div>

      <TweaksPanel state={tweaks} onChange={updateTweaks} />
    </div>
  );
}

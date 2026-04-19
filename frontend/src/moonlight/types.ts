export type ScreenKey =
  | 'onboarding'
  | 'home'
  | 'bubsense'
  | 'feed-timer'
  | 'timeline'
  | 'health'
  | 'insights'
  | 'settings'
  | 'quick-log';

export type TabKey = 'home' | 'timeline' | 'health' | 'insights' | 'settings';

export type OrbMode = 'calm' | 'sleepy' | 'alert' | 'hungry' | 'content';

export type QuickLogKind = 'diaper' | 'note' | 'pump';

export type ScreenParams = {
  kind?: QuickLogKind;
  mode?: 'ask';
};

export type GoFn = (screen: ScreenKey, params?: ScreenParams) => void;
export type ToastFn = (message: string) => void;

export type AppCtx = {
  clock: string;
  nowMin: number;
};

export type TimelineEvent = {
  t: number;
  duration: number;
  type: 'sleep' | 'feed' | 'diaper' | 'play';
};

export type ScreenProps = {
  go: GoFn;
  toast: ToastFn;
};

export type HomeScreenProps = ScreenProps & {
  ctx: AppCtx;
  lastFeed: number;
};

export type BubsenseScreenProps = ScreenProps & {
  ctx: AppCtx;
  lastFeed: number;
  startMode?: 'ask';
};

export type QuickLogScreenProps = ScreenProps & {
  kind: QuickLogKind;
};

export type Mode = 'night' | 'day';
export type AccentKey = 'coral' | 'sage' | 'lavender' | 'amber' | 'blue';
export type Density = 'compact' | 'cozy' | 'spacious';
export type Motion = 'on' | 'off';

export type Tweaks = {
  mode: Mode;
  accent: AccentKey;
  density: Density;
  motion: Motion;
};

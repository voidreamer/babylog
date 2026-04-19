export type TabKey = 'home' | 'timeline' | 'health' | 'insights' | 'settings';

export type OrbMode = 'calm' | 'sleepy' | 'alert' | 'hungry' | 'content';

export type TimelineEvent = {
  t: number;
  duration: number;
  type: 'sleep' | 'feed' | 'diaper' | 'play';
};

import type { TimelineEvent } from './types';

export const TODAY: TimelineEvent[] = [
  { t: 0.5, duration: 2.2, type: 'sleep' },
  { t: 3.2, duration: 0.3, type: 'feed' },
  { t: 3.8, duration: 2.8, type: 'sleep' },
  { t: 7.1, duration: 0.4, type: 'feed' },
  { t: 7.8, duration: 0.2, type: 'diaper' },
  { t: 8.5, duration: 1.2, type: 'play' },
  { t: 10.2, duration: 1.5, type: 'sleep' },
  { t: 12.1, duration: 0.3, type: 'feed' },
  { t: 13.2, duration: 1.2, type: 'play' },
];

export const EVENT_COLORS: Record<TimelineEvent['type'], string> = {
  sleep: '#8BA5C4',
  feed: '#E89580',
  diaper: '#D9C388',
  play: '#9BC29E',
};

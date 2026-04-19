import type { TimelineEvent } from './types';

export const EVENT_COLORS: Record<TimelineEvent['type'], string> = {
  sleep: '#8BA5C4',
  feed: '#E89580',
  diaper: '#D9C388',
  play: '#9BC29E',
};

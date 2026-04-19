/**
 * Per-action usage tracking for the moonlight home screen's dynamic layout.
 *
 * Persisted in localStorage so the ranking survives reloads. Decays entries
 * older than a 7-day window so lapsed actions don't permanently pin a slot —
 * if a family stops using pump at 4 months, it naturally demotes back to the
 * compact row.
 */

export type SecondaryKind =
  | 'diaper'
  | 'pump'
  | 'tummy'
  | 'potty'
  | 'bath'
  | 'supplement'
  | 'solid';

type UsageEntry = { count: number; lastUsed: number };
type UsageMap = Partial<Record<SecondaryKind, UsageEntry>>;

const STORAGE_KEY = 'heybub_moonlight_usage';
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Tie-break ordering when usage counts are equal (also the cold-start order). */
const DEFAULT_PRIORITY: readonly SecondaryKind[] = [
  'diaper',
  'pump',
  'tummy',
  'solid',
  'potty',
  'bath',
  'supplement',
];

function readMap(): UsageMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UsageMap) : {};
  } catch {
    return {};
  }
}

function writeMap(map: UsageMap): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    /* quota — safe to ignore; ranking just falls back to defaults */
  }
}

/** Increment usage for a kind. Called on every quick-log (chip tap OR modal save). */
export function bumpUsage(kind: SecondaryKind): void {
  const map = readMap();
  const now = Date.now();
  const prev = map[kind];
  // Reset stale counts so a burst of use after a long pause starts fresh.
  const baseCount = prev && now - prev.lastUsed < WINDOW_MS ? prev.count : 0;
  map[kind] = { count: baseCount + 1, lastUsed: now };
  writeMap(map);
}

/** Effective weight of an entry: 0 if stale, else count. */
function weightOf(entry: UsageEntry | undefined, now: number): number {
  if (!entry) return 0;
  if (now - entry.lastUsed > WINDOW_MS) return 0;
  return entry.count;
}

/**
 * Rank the provided candidates by recent usage (desc). Ties and zero-weight
 * entries break on DEFAULT_PRIORITY order. Candidates not in DEFAULT_PRIORITY
 * fall to the end.
 */
export function getRankedActions(candidates: SecondaryKind[]): SecondaryKind[] {
  const map = readMap();
  const now = Date.now();
  const priorityIndex = (k: SecondaryKind) => {
    const i = DEFAULT_PRIORITY.indexOf(k);
    return i === -1 ? DEFAULT_PRIORITY.length : i;
  };
  return [...candidates].sort((a, b) => {
    const wa = weightOf(map[a], now);
    const wb = weightOf(map[b], now);
    if (wa !== wb) return wb - wa;
    return priorityIndex(a) - priorityIndex(b);
  });
}

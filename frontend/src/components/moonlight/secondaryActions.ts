import type { SecondaryKind } from './usage';

/** i18n + color metadata per secondary action kind. The modals themselves are
 *  lazy-loaded directly in Home.tsx to keep the registry tree-shakeable. */
export const SECONDARY_META: Record<
  SecondaryKind,
  { labelKey: string; color: string; iconName: IconName }
> = {
  diaper: { labelKey: 'dashboard:quickActionsSection.diaper', color: '#D9C388', iconName: 'diaper' },
  pump: { labelKey: 'dashboard:quickActionsSection.pump', color: '#9BC29E', iconName: 'pump' },
  tummy: { labelKey: 'common:widgets.tummyTime', color: '#E8A564', iconName: 'tummy' },
  potty: { labelKey: 'common:widgets.potty', color: '#D98571', iconName: 'potty' },
  bath: { labelKey: 'common:widgets.bath', color: '#8BA5C4', iconName: 'bath' },
  supplement: { labelKey: 'common:widgets.supplement', color: '#9BC29E', iconName: 'drop' },
  solid: { labelKey: 'dashboard:solid.title', color: '#E89580', iconName: 'spoon' },
};

export type IconName =
  | 'diaper'
  | 'feed'
  | 'sleep'
  | 'plus'
  | 'note'
  | 'play'
  | 'check'
  | 'home'
  | 'bath'
  | 'pump'
  | 'drop'
  | 'spoon'
  | 'potty'
  | 'tummy';

/** Maps our SecondaryKind to the widget-id used in localStorage('visibleWidgets'). */
const WIDGET_ID_BY_KIND: Record<SecondaryKind, string> = {
  diaper: 'diaper',
  pump: 'pumping',
  tummy: 'tummy',
  potty: 'potty',
  bath: 'bath',
  supplement: 'supplement',
  solid: 'solid',
};

/**
 * Age-gated list of secondary actions. Mirrors the logic in Dashboard's
 * getDefaultWidgets so moonlight shows the same surface as production, then
 * respects localStorage('visibleWidgets') so the user's classic-dashboard
 * widget-visibility toggles apply on moonlight home too.
 */
export function getApplicableSecondaryActions(ageMonths: number | null): SecondaryKind[] {
  const ageGated: SecondaryKind[] = ['diaper'];
  if (ageMonths === null || ageMonths <= 12) {
    ageGated.push('pump', 'tummy', 'supplement');
  }
  if (ageMonths !== null && ageMonths >= 4) {
    ageGated.push('solid');
  }
  if (ageMonths !== null && ageMonths >= 18) {
    ageGated.push('potty');
  }
  ageGated.push('bath');

  // Intersect with visibleWidgets if set; otherwise return full age-gated list.
  if (typeof window === 'undefined') return ageGated;
  let visible: string[] | null = null;
  try {
    const raw = localStorage.getItem('visibleWidgets');
    if (raw) visible = JSON.parse(raw);
  } catch {
    visible = null;
  }
  if (!Array.isArray(visible) || visible.length === 0) return ageGated;
  return ageGated.filter((kind) => visible!.includes(WIDGET_ID_BY_KIND[kind]));
}

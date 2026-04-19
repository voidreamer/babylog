import type { SecondaryKind } from './usage';

/** i18n + color metadata per secondary action kind. The modals themselves are
 *  lazy-loaded directly in Home.tsx to keep the registry tree-shakeable. */
export const SECONDARY_META: Record<
  SecondaryKind,
  { labelKey: string; color: string; iconName: IconName }
> = {
  diaper: { labelKey: 'dashboard:quickActionsSection.diaper', color: '#D9C388', iconName: 'diaper' },
  pump: { labelKey: 'dashboard:quickActionsSection.pump', color: '#9BC29E', iconName: 'plus' },
  tummy: { labelKey: 'common:widgets.tummyTime', color: '#E8A564', iconName: 'play' },
  potty: { labelKey: 'common:widgets.potty', color: '#D98571', iconName: 'check' },
  bath: { labelKey: 'common:widgets.bath', color: '#8BA5C4', iconName: 'home' },
  supplement: { labelKey: 'common:widgets.supplement', color: '#9BC29E', iconName: 'plus' },
  solid: { labelKey: 'dashboard:solid.title', color: '#E89580', iconName: 'feed' },
};

export type IconName =
  | 'diaper'
  | 'feed'
  | 'sleep'
  | 'plus'
  | 'note'
  | 'play'
  | 'check'
  | 'home';

/**
 * Age-gated list of secondary actions. Mirrors the logic in Dashboard's
 * getDefaultWidgets so moonlight shows the same surface as production.
 */
export function getApplicableSecondaryActions(ageMonths: number | null): SecondaryKind[] {
  const actions: SecondaryKind[] = ['diaper'];
  if (ageMonths === null || ageMonths <= 12) {
    actions.push('pump', 'tummy', 'supplement');
  }
  if (ageMonths !== null && ageMonths >= 4) {
    actions.push('solid');
  }
  if (ageMonths !== null && ageMonths >= 18) {
    actions.push('potty');
  }
  actions.push('bath');
  return actions;
}

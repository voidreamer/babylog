/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Syringe, AlertTriangle, Check, X as XIcon } from 'lucide-react';
import { calculateAgeInMonths } from '../../utils/ageUtils';

const VaccinationSchedule = lazy(() => import('../health/VaccinationSchedule'));

type Props = {
  baby: any;
  vaccinations: any[];
  onDataChanged?: () => void;
};

// Minimal schedule — same data the classic VaccinationSchedule uses, kept local
// so this card doesn't drag in the classic component unless opened. Keyed on
// region derived from browser / preference.
const CDC_SCHEDULE: { ageMonths: number; vaccines: string[] }[] = [
  { ageMonths: 0, vaccines: ['Hep B'] },
  { ageMonths: 2, vaccines: ['DTaP', 'IPV', 'Hib', 'PCV13', 'RV', 'Hep B'] },
  { ageMonths: 4, vaccines: ['DTaP', 'IPV', 'Hib', 'PCV13', 'RV'] },
  { ageMonths: 6, vaccines: ['DTaP', 'Hib', 'PCV13', 'RV', 'Hep B', 'Influenza'] },
  { ageMonths: 12, vaccines: ['MMR', 'Varicella', 'Hep A', 'PCV13'] },
  { ageMonths: 15, vaccines: ['DTaP'] },
  { ageMonths: 18, vaccines: ['Hep A'] },
];

const CANADA_SCHEDULE: { ageMonths: number; vaccines: string[] }[] = [
  { ageMonths: 0, vaccines: ['Hep B'] },
  { ageMonths: 2, vaccines: ['DTaP-IPV-Hib', 'Pneu-C-13', 'RV'] },
  { ageMonths: 4, vaccines: ['DTaP-IPV-Hib', 'Pneu-C-13', 'RV'] },
  { ageMonths: 6, vaccines: ['DTaP-IPV-Hib', 'Influenza'] },
  { ageMonths: 12, vaccines: ['MMR', 'Pneu-C-13', 'Men-C', 'Varicella'] },
  { ageMonths: 18, vaccines: ['DTaP-IPV-Hib', 'MMRV'] },
];

function ageLabel(ageMonths: number, t: (k: string, o?: any) => string): string {
  if (ageMonths === 0) return t('health:schedule.birth', { defaultValue: 'birth' });
  if (ageMonths < 12)
    return t('health:schedule.monthsN', {
      defaultValue: `${ageMonths} months`,
      count: ageMonths,
    });
  if (ageMonths === 12)
    return t('health:schedule.oneYear', { defaultValue: '1 year' });
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (months === 0)
    return t('health:schedule.yearsN', { defaultValue: `${years} years`, count: years });
  return `${years}y ${months}m`;
}

/**
 * "Next up" vaccination summary card.
 *
 * Picks the most relevant schedule group — the earliest one that still has
 * outstanding vaccines given the baby's age. Surfaces that group's label +
 * remaining vaccines + overdue marker when the group's age is already past.
 *
 * Tap opens the full VaccinationSchedule in a bottom-sheet for detailed
 * marking / history.
 */
export default function MoonlightVaxCard({ baby, vaccinations, onDataChanged }: Props) {
  const { t } = useTranslation(['health', 'common']);
  const [sheetOpen, setSheetOpen] = useState(false);

  const region: 'us' | 'ca' = useMemo(() => {
    const lang = localStorage.getItem('language') || navigator.language || '';
    if (lang.includes('CA') || lang.includes('ca')) return 'ca';
    return 'us';
  }, []);

  const schedule = region === 'ca' ? CANADA_SCHEDULE : CDC_SCHEDULE;

  const babyAgeMonths = baby?.birth_date
    ? calculateAgeInMonths(baby.birth_date)
    : null;

  // Build a count map of administered vaccines so we can tell when a repeat
  // dose (e.g. DTaP across multiple age groups) is still outstanding.
  const administeredCounts = useMemo(() => {
    const map = new Map<string, number>();
    vaccinations?.forEach((v) => {
      const key = (v.vaccine_name || '').toUpperCase().trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [vaccinations]);

  const summary = useMemo(() => {
    if (babyAgeMonths === null) {
      return { nextGroup: schedule[0], outstanding: schedule[0].vaccines, overdueCount: 0 };
    }
    // Count how many times each vaccine has been administered so far, then walk
    // the schedule in order. For each group, mark vaccines outstanding if
    // administered count < (number of times this vaccine appears in prior
    // groups + 1).
    const consumed = new Map<string, number>();
    let nextGroup: (typeof schedule)[number] | null = null;
    let outstanding: string[] = [];
    let overdueCount = 0;

    for (const group of schedule) {
      const outstandingThisGroup: string[] = [];
      for (const vax of group.vaccines) {
        const key = vax.toUpperCase().trim();
        const used = consumed.get(key) || 0;
        const have = administeredCounts.get(key) || 0;
        if (have > used) {
          // Administered — advance the consumed counter.
          consumed.set(key, used + 1);
        } else {
          outstandingThisGroup.push(vax);
          // Do NOT advance — this slot is still open.
        }
      }
      if (outstandingThisGroup.length === 0) continue;
      if (nextGroup === null) {
        nextGroup = group;
        outstanding = outstandingThisGroup;
      }
      // Count any *past* overdue age groups — i.e. group age is ≥ 2 months
      // before current age and has outstanding vaccines.
      if (babyAgeMonths - group.ageMonths >= 2) {
        overdueCount += outstandingThisGroup.length;
      }
    }

    return { nextGroup, outstanding, overdueCount };
  }, [administeredCounts, babyAgeMonths, schedule]);

  const isOverdue =
    babyAgeMonths !== null &&
    summary.nextGroup !== null &&
    babyAgeMonths - summary.nextGroup.ageMonths >= 2;

  const allDone = summary.nextGroup === null;

  return (
    <>
      <button
        type="button"
        onClick={() => setSheetOpen(true)}
        style={{
          width: '100%',
          padding: '16px',
          borderRadius: 18,
          background: allDone
            ? 'color-mix(in srgb, #9BC29E 10%, transparent)'
            : isOverdue
              ? 'color-mix(in srgb, #D98571 10%, transparent)'
              : 'var(--ml-surface)',
          border: '0.5px solid ' + (allDone
            ? 'color-mix(in srgb, #9BC29E 35%, transparent)'
            : isOverdue
              ? 'color-mix(in srgb, #D98571 40%, transparent)'
              : 'var(--ml-line)'),
          display: 'flex',
          alignItems: 'center',
          gap: 14,
          textAlign: 'left',
          cursor: 'pointer',
          fontFamily: 'inherit',
          color: 'var(--ml-text)',
        }}
      >
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            background: allDone
              ? 'color-mix(in srgb, #9BC29E 18%, transparent)'
              : isOverdue
                ? 'color-mix(in srgb, #D98571 18%, transparent)'
                : 'color-mix(in srgb, var(--ml-accent) 18%, transparent)',
            color: allDone ? '#9BC29E' : isOverdue ? '#D98571' : 'var(--ml-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          {allDone ? (
            <Check size={18} aria-hidden="true" />
          ) : isOverdue ? (
            <AlertTriangle size={18} aria-hidden="true" />
          ) : (
            <Syringe size={18} aria-hidden="true" />
          )}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mono" style={{ marginBottom: 2 }}>
            {allDone
              ? t('health:schedule.allDone', { defaultValue: 'all caught up' })
              : isOverdue
                ? t('health:schedule.overdue', { defaultValue: 'overdue' })
                : t('health:schedule.nextUp', { defaultValue: 'next up' })}
          </div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 500,
              color: 'var(--ml-text)',
              letterSpacing: -0.1,
            }}
          >
            {allDone
              ? t('health:schedule.allDoseScheduleComplete', {
                  defaultValue: 'No doses on the schedule remaining.',
                })
              : (
                <>
                  <span className="serif italic" style={{ color: 'var(--ml-accent)' }}>
                    {ageLabel(summary.nextGroup!.ageMonths, t)}
                  </span>
                  <span style={{ marginLeft: 6, color: 'var(--ml-text-2)', fontSize: 14 }}>
                    {summary.outstanding.slice(0, 3).join(' · ')}
                    {summary.outstanding.length > 3
                      ? ` · +${summary.outstanding.length - 3}`
                      : ''}
                  </span>
                </>
              )}
          </div>
          {!allDone && summary.overdueCount > 0 && (
            <div
              style={{
                marginTop: 4,
                fontSize: 12,
                color: '#D98571',
                fontFamily: 'inherit',
              }}
            >
              {t('health:schedule.overdueCount', {
                defaultValue: '{{count}} dose(s) overdue',
                count: summary.overdueCount,
              })}
            </div>
          )}
        </div>
      </button>

      {/* Detailed schedule sheet */}
      {sheetOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSheetOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(10, 7, 6, 0.5)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'center',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 640,
              maxHeight: '90vh',
              background: 'var(--ml-bg)',
              borderRadius: '24px 24px 0 0',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '0.5px solid var(--ml-line)',
            }}
          >
            <div
              style={{
                padding: '18px 20px 10px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                borderBottom: '0.5px solid var(--ml-line)',
              }}
            >
              <div style={{ flex: 1 }}>
                <div className="mono">
                  {t('health:schedule.title', { defaultValue: 'schedule' }).toLowerCase()}
                </div>
                <div style={{ fontSize: 16, fontWeight: 500, color: 'var(--ml-text)' }}>
                  {region === 'ca' ? 'NACI · Canada' : 'CDC · United States'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSheetOpen(false)}
                aria-label={t('common:close')}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  border: '0.5px solid var(--ml-line)',
                  background: 'transparent',
                  color: 'var(--ml-text-2)',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontFamily: 'inherit',
                }}
              >
                <XIcon size={16} />
              </button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              <Suspense
                fallback={
                  <div
                    className="serif italic"
                    style={{
                      color: 'var(--ml-text-3)',
                      textAlign: 'center',
                      padding: 24,
                    }}
                  >
                    {t('common:loading', { defaultValue: 'Loading\u2026' })}
                  </div>
                }
              >
                <VaccinationSchedule
                  baby={baby}
                  vaccinations={vaccinations}
                  onDataChanged={onDataChanged}
                />
              </Suspense>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

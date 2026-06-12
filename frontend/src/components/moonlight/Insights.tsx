/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, Suspense, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useBaby } from '../../hooks/useBaby';
import { formatAgeLabel } from '../../utils/ageUtils';

const BabyInsights = lazy(() => import('../BabyInsights'));

type Props = { isPremium?: boolean };

/**
 * Moonlight Insights — wraps the existing BabyInsights component with a
 * moonlight header and intro, then CSS overrides in moonlight.css restyle
 * the inner surfaces (time-range toggle, cards, loading/error/empty states).
 *
 * Premium gating is unchanged — the isPremium prop flows straight through
 * to BabyInsights.
 */
export default function MoonlightInsights({ isPremium = false }: Props) {
  const { t } = useTranslation(['dashboard', 'common']);
  const { selectedBaby } = useBaby();

  const ageLabel = useMemo(
    () => formatAgeLabel(selectedBaby?.birth_date, t),
    [selectedBaby, t],
  );

  return (
    <div style={{ padding: '16px 20px 8px', color: 'var(--ml-text)' }}>
      {/* Moonlight header: compact and plain (see Timeline/Health). */}
      {selectedBaby && ageLabel && (
        <div className="mono" style={{ marginBottom: 2 }}>
          {t('dashboard:learn.forBabyAge', { name: selectedBaby.name, age: ageLabel }).toLowerCase()}
        </div>
      )}
      <h1
        style={{
          fontFamily: 'Geist Variable, Geist, -apple-system, sans-serif',
          fontWeight: 400,
          fontSize: 24,
          margin: '2px 0 16px',
          letterSpacing: -0.4,
          color: 'var(--ml-text)',
        }}
      >
        {t('dashboard:learn.insights', { defaultValue: 'Insights' })}
      </h1>

      <Suspense
        fallback={
          <div
            className="serif italic"
            style={{
              color: 'var(--ml-text-3)',
              padding: '24px 0',
              textAlign: 'center',
            }}
          >
            {t('common:loading', { defaultValue: 'Loading…' })}
          </div>
        }
      >
        <BabyInsights isPremium={isPremium} />
      </Suspense>
    </div>
  );
}

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
      {/* Moonlight header */}
      <div className="mono" style={{ marginBottom: 2 }}>
        {t('dashboard:learn.insights').toLowerCase()}
      </div>
      <h1
        style={{
          fontFamily: 'Geist Variable, Geist, -apple-system, sans-serif',
          fontWeight: 300,
          fontSize: 34,
          margin: '2px 0 4px',
          letterSpacing: -1,
          color: 'var(--ml-text)',
        }}
      >
        {t('dashboard:moonlight.patternsAnd', { defaultValue: 'Patterns & ' })}
        <em className="serif" style={{ color: 'var(--ml-accent)', fontStyle: 'italic' }}>
          {t('dashboard:moonlight.rhythms', { defaultValue: 'rhythms' })}
        </em>
      </h1>
      {selectedBaby && ageLabel && (
        <p
          className="serif italic"
          style={{
            fontSize: 14,
            lineHeight: 1.4,
            color: 'var(--ml-text-2)',
            margin: '8px 0 20px',
          }}
        >
          {t('dashboard:learn.forBabyAge', { name: selectedBaby.name, age: ageLabel })}
        </p>
      )}

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

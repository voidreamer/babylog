/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { useBaby } from '../../hooks/useBaby';
import { Baby } from 'lucide-react';

const Health = lazy(() => import('../../pages/Health'));

type Props = {
  showMedQuickLog?: boolean;
  onDismissMedQuickLog?: () => void;
};

/**
 * Moonlight Health — Phase 7a of 7a-b-c.
 *
 * Ships the moonlight shell (header + container + spacing) and mounts the
 * classic Health page inside. Growth chart (7b) and Vaccination schedule +
 * conditions grid + records summary (7c) are explicit follow-ups.
 *
 * With the flag off the classic Health page renders unchanged. With the flag
 * on and this phase merged, users see a moonlight-branded Health tab; the
 * inner cards clearly carry classic styling, making the work-in-progress
 * state obvious rather than accidental.
 */
export default function MoonlightHealth({
  showMedQuickLog,
  onDismissMedQuickLog,
}: Props) {
  const { t } = useTranslation(['health', 'common']);
  const { selectedBaby } = useBaby();

  if (!selectedBaby) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '80px 20px',
          gap: 12,
          color: 'var(--ml-text-2)',
        }}
      >
        <Baby size={40} style={{ opacity: 0.5 }} aria-hidden="true" />
        <div className="serif italic" style={{ fontSize: 17 }}>
          {t('common:noBabySelected')}
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '16px 20px 8px', color: 'var(--ml-text)' }}>
      {/* Moonlight header */}
      <div className="mono" style={{ marginBottom: 2 }}>
        {t('health:title', { defaultValue: 'health' }).toLowerCase()}
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
        {t('health:moonlight.growthAnd', { defaultValue: 'Growth & ' })}
        <em
          className="serif"
          style={{ color: 'var(--ml-accent)', fontStyle: 'italic' }}
        >
          {t('health:moonlight.wellbeing', { defaultValue: 'wellbeing' })}
        </em>
      </h1>
      <p
        className="serif italic"
        style={{
          fontSize: 15,
          lineHeight: 1.4,
          color: 'var(--ml-text-2)',
          margin: '8px 0 20px',
          maxWidth: 320,
        }}
      >
        {t('health:moonlight.intro', {
          defaultValue:
            "Growth curves, vaccinations, and the small things worth remembering.",
        })}
      </p>

      {/* Classic Health body — re-skinned piece by piece in 7b/7c. */}
      <div className="ml-health-classic">
        <Suspense
          fallback={
            <div
              className="serif italic"
              style={{ color: 'var(--ml-text-3)', padding: '20px 0', textAlign: 'center' }}
            >
              {t('common:loading')}
            </div>
          }
        >
          <Health
            showMedQuickLog={showMedQuickLog}
            onDismissMedQuickLog={onDismissMedQuickLog}
          />
        </Suspense>
      </div>
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { lazy, Suspense, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TrendingUp } from 'lucide-react';
import { useUnits } from '../../hooks/useUnits';
import { calculateAgeInMonths } from '../../utils/ageUtils';
import { Icon } from './Icon';

const GrowthChart = lazy(() => import('../health/GrowthChart'));

type WhoRow = { p3: number; p15: number; p50: number; p85: number; p97: number };

/** 5-band interpolation, matches production GrowthCard exactly. */
function getPercentilePosition(value: number | null, whoRow: WhoRow | null): number | null {
  if (!value || !whoRow) return null;
  const bands: [number, number][] = [
    [whoRow.p3, 3],
    [whoRow.p15, 15],
    [whoRow.p50, 50],
    [whoRow.p85, 85],
    [whoRow.p97, 97],
  ];
  if (value <= bands[0][0]) return Math.max(1, Math.round(3 * (value / bands[0][0])));
  const last = bands[bands.length - 1];
  if (value >= last[0])
    return Math.min(99, 97 + Math.round(2 * ((value - last[0]) / last[0])));
  for (let i = 0; i < bands.length - 1; i++) {
    const [lowVal, lowP] = bands[i];
    const [highVal, highP] = bands[i + 1];
    if (value >= lowVal && value <= highVal) {
      const ratio = (value - lowVal) / (highVal - lowVal);
      return Math.round(lowP + ratio * (highP - lowP));
    }
  }
  return 50;
}

/** Status classification for the percentile bar fill color. */
type Status = 'on-track' | 'watch' | 'concern' | 'neutral';
function getPercentileStatus(position: number | null): Status {
  if (position === null) return 'neutral';
  if (position < 10 || position > 90) return 'concern';
  if (position < 20 || position > 80) return 'watch';
  return 'on-track';
}

/** Short human label for a percentile; matches production's buckets. */
function getPercentileLabel(position: number | null): string {
  if (position === null) return '--';
  if (position < 5) return '<3rd';
  if (position < 20) return '~10th';
  if (position < 40) return '~25th';
  if (position < 60) return '~50th';
  if (position < 80) return '~75th';
  if (position < 95) return '~90th';
  return '>97th';
}

const STATUS_COLOR: Record<Status, string> = {
  'on-track': '#9BC29E', // mint — within 20..80
  watch: '#E8A564', // warm gold — 10..20 / 80..90
  concern: '#D98571', // terracotta — <10 or >90
  neutral: 'var(--ml-text-3)',
};

type Props = {
  baby: any;
  growthRecords: any[];
  whoData?: {
    WHO_WEIGHT_BOYS: any[];
    WHO_WEIGHT_GIRLS: any[];
    WHO_HEIGHT_BOYS: any[];
    WHO_HEIGHT_GIRLS: any[];
  };
  onOpenGrowthModal?: () => void;
};

export default function MoonlightGrowthCard({
  baby,
  growthRecords,
  whoData,
  onOpenGrowthModal,
}: Props) {
  const { t } = useTranslation('health');
  const { formatWeight, formatLength } = useUnits();
  const [chartOpen, setChartOpen] = useState(false);

  const latest = growthRecords && growthRecords.length > 0 ? growthRecords[0] : null;

  const ageMonths = useMemo(
    () => (baby?.birth_date ? calculateAgeInMonths(baby.birth_date) : null),
    [baby?.birth_date],
  );

  const weightWho = useMemo(() => {
    if (!whoData || ageMonths === null) return null;
    const dataSet =
      baby?.gender === 'girl' ? whoData.WHO_WEIGHT_GIRLS : whoData.WHO_WEIGHT_BOYS;
    return dataSet?.find((d: any) => d.months === Math.round(ageMonths)) || null;
  }, [whoData, ageMonths, baby?.gender]);

  const heightWho = useMemo(() => {
    if (!whoData || ageMonths === null) return null;
    const dataSet =
      baby?.gender === 'girl' ? whoData.WHO_HEIGHT_GIRLS : whoData.WHO_HEIGHT_BOYS;
    return dataSet?.find((d: any) => d.months === Math.round(ageMonths)) || null;
  }, [whoData, ageMonths, baby?.gender]);

  const weightPos = latest?.weight_kg
    ? getPercentilePosition(parseFloat(latest.weight_kg), weightWho)
    : null;
  const heightPos = latest?.height_cm
    ? getPercentilePosition(parseFloat(latest.height_cm), heightWho)
    : null;

  const MetricTile = ({
    label,
    value,
    percentileLabel,
    position,
  }: {
    label: string;
    value: string;
    percentileLabel: string;
    position: number | null;
  }) => {
    const status = getPercentileStatus(position);
    const width = position === null ? 0 : position;
    return (
      <div
        style={{
          padding: '14px 14px 12px',
          borderRadius: 18,
          background: 'var(--ml-surface)',
          border: '0.5px solid var(--ml-line)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div className="mono">{label}</div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 500,
            letterSpacing: -0.3,
            color: 'var(--ml-text)',
            margin: '2px 0',
          }}
        >
          {value}
        </div>
        <div style={{ fontSize: 11, color: 'var(--ml-text-2)', marginBottom: 4 }}>
          {percentileLabel} {t('growth.percentile')}
        </div>
        <div
          aria-hidden="true"
          style={{
            position: 'relative',
            height: 4,
            borderRadius: 2,
            background: 'var(--ml-line)',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              width: `${width}%`,
              height: '100%',
              background: STATUS_COLOR[status],
              borderRadius: 2,
              transition: 'width 0.4s',
            }}
          />
        </div>
      </div>
    );
  };

  return (
    <section>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 12 }}>
        <div className="mono">{t('growth.title').toLowerCase()}</div>
        <button
          type="button"
          onClick={() => setChartOpen((v) => !v)}
          style={{
            marginLeft: 'auto',
            background: 'transparent',
            border: 'none',
            color: 'var(--ml-accent)',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 600,
            letterSpacing: 0.2,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          {chartOpen ? t('growth.hideChart') : t('growth.fullChart')}
          <Icon.Arrow />
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
        <MetricTile
          label={t('growth.weight')}
          value={latest?.weight_kg ? formatWeight(latest.weight_kg) : '--'}
          percentileLabel={getPercentileLabel(weightPos)}
          position={weightPos}
        />
        <MetricTile
          label={t('growth.height')}
          value={latest?.height_cm ? formatLength(latest.height_cm) : '--'}
          percentileLabel={getPercentileLabel(heightPos)}
          position={heightPos}
        />
        <MetricTile
          label={t('growth.head')}
          value={latest?.head_cm ? formatLength(latest.head_cm) : '--'}
          percentileLabel="--"
          position={null}
        />
      </div>

      <button
        type="button"
        onClick={onOpenGrowthModal}
        style={{
          marginTop: 12,
          width: '100%',
          height: 52,
          borderRadius: 999,
          background: 'var(--ml-surface)',
          border: '0.5px solid var(--ml-line)',
          color: 'var(--ml-text)',
          fontFamily: 'inherit',
          fontSize: 14,
          fontWeight: 500,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 8,
        }}
      >
        <TrendingUp size={16} aria-hidden="true" />
        {t('growth.logMeasurement')}
      </button>

      {chartOpen && baby && (
        <div className="ml-growth-wrap" style={{ marginTop: 16 }}>
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
            <GrowthChart baby={baby} growthRecords={growthRecords} />
          </Suspense>
        </div>
      )}
    </section>
  );
}

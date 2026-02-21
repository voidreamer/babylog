/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, lazy, Suspense } from 'react';
import { TrendingUp, ChevronRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../../hooks/useUnits';
import { calculateAgeInMonths } from '../../utils/ageUtils';

// Lazy load the GrowthChart component - only loads when user clicks "Full Chart"
const GrowthChart = lazy(() => import('./GrowthChart'));

// Calculate percentile position (0-100) based on WHO data — 5-band interpolation
function getPercentilePosition(value: number | null, whoRow: { p3: number; p15: number; p50: number; p85: number; p97: number } | null): number | null {
    if (!value || !whoRow) return null;
    const bands: [number, number][] = [
        [whoRow.p3, 3], [whoRow.p15, 15], [whoRow.p50, 50], [whoRow.p85, 85], [whoRow.p97, 97],
    ];
    if (value <= bands[0][0]) return Math.max(1, Math.round(3 * (value / bands[0][0])));
    if (value >= bands[bands.length - 1][0]) return Math.min(99, 97 + Math.round(2 * ((value - bands[bands.length - 1][0]) / bands[bands.length - 1][0])));
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

// Get status color based on percentile
function getPercentileStatus(position: number | null): string {
    if (position === null) return 'neutral';
    if (position < 10 || position > 90) return 'concern';
    if (position < 20 || position > 80) return 'watch';
    return 'on-track';
}

// Get approximate percentile label
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

interface GrowthCardProps { baby: any; growthRecords: any[]; onRecordAdded?: () => void; whoData?: any; defaultChartVisible?: boolean; onOpenGrowthModal?: () => void; }
export default function GrowthCard({ baby, growthRecords, onRecordAdded, whoData, defaultChartVisible = false, onOpenGrowthModal }: GrowthCardProps) {
    const { t } = useTranslation('health');
    const { formatWeight, formatLength } = useUnits();
    const [showChart, setShowChart] = useState(defaultChartVisible);

    // Get latest record
    const latestRecord = growthRecords && growthRecords.length > 0 ? growthRecords[0] : null;

    // Calculate baby's age in months
    const babyAgeMonths = baby?.birth_date
        ? calculateAgeInMonths(baby.birth_date)
        : null;

    // Get WHO percentile data for current age
    const getWhoDataForAge = (dataSet: any[], ageMonths: number | null) => {
        if (!dataSet || ageMonths === null) return null;
        const data = dataSet.find(d => d.months === Math.round(ageMonths));
        return data || null;
    };

    const weightWho = whoData ? getWhoDataForAge(
        baby?.gender === 'girl' ? whoData.WHO_WEIGHT_GIRLS : whoData.WHO_WEIGHT_BOYS,
        babyAgeMonths
    ) : null;

    const heightWho = whoData ? getWhoDataForAge(
        baby?.gender === 'girl' ? whoData.WHO_HEIGHT_GIRLS : whoData.WHO_HEIGHT_BOYS,
        babyAgeMonths
    ) : null;

    // Calculate percentile positions (5-band interpolation matching chart)
    const weightPosition = latestRecord?.weight_kg && weightWho
        ? getPercentilePosition(parseFloat(latestRecord.weight_kg), weightWho)
        : null;
    const heightPosition = latestRecord?.height_cm && heightWho
        ? getPercentilePosition(parseFloat(latestRecord.height_cm), heightWho)
        : null;

    return (
        <div className="health-card">
            <div className="health-card-header">
                <h3 className="health-card-title">
                    <TrendingUp size={18} />
                    {t('growth.title')}
                </h3>
                <button
                    className="health-card-action"
                    onClick={() => setShowChart(!showChart)}
                >
                    {showChart ? t('growth.hideChart') : t('growth.fullChart')}
                    <ChevronRight size={16} className={showChart ? 'rotated' : ''} />
                </button>
            </div>

            {/* Metric Boxes */}
            <div className="growth-metrics">
                <div className="growth-metric-box">
                    <div className="growth-metric-label">{t('growth.weight')}</div>
                    <div className="growth-metric-value">
                        {latestRecord?.weight_kg ? formatWeight(latestRecord.weight_kg) : '--'}
                    </div>
                    <div className="growth-metric-percentile">
                        {getPercentileLabel(weightPosition)} {t('growth.percentile')}
                    </div>
                    <div className="percentile-bar">
                        <div
                            className={`percentile-fill ${getPercentileStatus(weightPosition)}`}
                            style={{ width: `${weightPosition ?? 0}%` }}
                        />
                    </div>
                </div>

                <div className="growth-metric-box">
                    <div className="growth-metric-label">{t('growth.height')}</div>
                    <div className="growth-metric-value">
                        {latestRecord?.height_cm ? formatLength(latestRecord.height_cm) : '--'}
                    </div>
                    <div className="growth-metric-percentile">
                        {getPercentileLabel(heightPosition)} {t('growth.percentile')}
                    </div>
                    <div className="percentile-bar">
                        <div
                            className={`percentile-fill ${getPercentileStatus(heightPosition)}`}
                            style={{ width: `${heightPosition ?? 0}%` }}
                        />
                    </div>
                </div>

                <div className="growth-metric-box">
                    <div className="growth-metric-label">{t('growth.head')}</div>
                    <div className="growth-metric-value">
                        {latestRecord?.head_cm ? formatLength(latestRecord.head_cm) : '--'}
                    </div>
                    <div className="growth-metric-percentile">--</div>
                    <div className="percentile-bar">
                        <div className="percentile-fill neutral" style={{ width: '0%' }} />
                    </div>
                </div>
            </div>

            {/* Log Measurement Button */}
            <button
                className="growth-add-btn"
                onClick={onOpenGrowthModal}
            >
                <Plus size={16} />
                {t('growth.logMeasurement')}
            </button>

            {/* Expandable Chart - Lazy loaded */}
            {showChart && baby && (
                <div className="growth-chart-container">
                    <Suspense fallback={
                        <div className="loading" style={{ padding: 'var(--space-xl)' }}>
                            <div className="spinner"></div>
                        </div>
                    }>
                        <GrowthChart
                            baby={baby}
                            growthRecords={growthRecords}
                        />
                    </Suspense>
                </div>
            )}
        </div>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, lazy, Suspense } from 'react';
import { TrendingUp, ChevronRight, Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../../hooks/useUnits';

// Lazy load the GrowthChart component - only loads when user clicks "Full Chart"
const GrowthChart = lazy(() => import('./GrowthChart'));

// Calculate percentile position (0-100) based on WHO data
function getPercentilePosition(value: number | null, p3: number | null, p97: number | null): number | null {
    if (!value || !p3 || !p97) return null;
    const position = ((value - p3) / (p97 - p3)) * 100;
    return Math.max(0, Math.min(100, position));
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
        ? Math.floor((new Date().getTime() - new Date(baby.birth_date).getTime()) / (1000 * 60 * 60 * 24 * 30.44))
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

    // Calculate percentile positions
    const weightPosition = latestRecord?.weight_kg && weightWho
        ? getPercentilePosition(parseFloat(latestRecord.weight_kg), weightWho.p3, weightWho.p97)
        : null;
    const heightPosition = latestRecord?.height_cm && heightWho
        ? getPercentilePosition(parseFloat(latestRecord.height_cm), heightWho.p3, heightWho.p97)
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

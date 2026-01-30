/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, lazy, Suspense } from 'react';
import { TrendingUp, ChevronRight, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { useTranslation } from 'react-i18next';

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

interface GrowthCardProps { baby: any; growthRecords: any[]; onRecordAdded?: () => void; whoData?: any; }
export default function GrowthCard({ baby, growthRecords, onRecordAdded, whoData }: GrowthCardProps) {
    const { t } = useTranslation('health');
    const [showChart, setShowChart] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        weight: '',
        height: '',
        head: ''
    });

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.weight && !formData.height && !formData.head) {
            toast.error(t('toast_pleaseEnterAtLeastOneMeasurement'));
            return;
        }

        setSaving(true);
        try {
            const data = {
                baby_id: baby.id,
                recorded_date: new Date().toISOString(),
                weight_kg: formData.weight ? parseFloat(formData.weight) : null,
                height_cm: formData.height ? parseFloat(formData.height) : null,
                head_cm: formData.head ? parseFloat(formData.head) : null,
            };

            await api.createGrowthRecord(data);
            toast.success(t('toast_growthRecorded'));
            setFormData({ weight: '', height: '', head: '' });
            setIsAdding(false);
            if (onRecordAdded) onRecordAdded();
        } catch (error) {
            toast.error('Failed to save: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="health-card">
            <div className="health-card-header">
                <h3 className="health-card-title">
                    <TrendingUp size={18} />
                    Growth
                </h3>
                <button
                    className="health-card-action"
                    onClick={() => setShowChart(!showChart)}
                >
                    {showChart ? 'Hide Chart' : 'Full Chart'}
                    <ChevronRight size={16} className={showChart ? 'rotated' : ''} />
                </button>
            </div>

            {/* Metric Boxes */}
            <div className="growth-metrics">
                <div className="growth-metric-box">
                    <div className="growth-metric-label">Weight</div>
                    <div className="growth-metric-value">
                        {latestRecord?.weight_kg ? `${parseFloat(latestRecord.weight_kg).toFixed(1)} kg` : '--'}
                    </div>
                    <div className="growth-metric-percentile">
                        {getPercentileLabel(weightPosition)} percentile
                    </div>
                    <div className="percentile-bar">
                        <div
                            className={`percentile-fill ${getPercentileStatus(weightPosition)}`}
                            style={{ width: `${weightPosition ?? 0}%` }}
                        />
                    </div>
                </div>

                <div className="growth-metric-box">
                    <div className="growth-metric-label">Height</div>
                    <div className="growth-metric-value">
                        {latestRecord?.height_cm ? `${parseFloat(latestRecord.height_cm).toFixed(1)} cm` : '--'}
                    </div>
                    <div className="growth-metric-percentile">
                        {getPercentileLabel(heightPosition)} percentile
                    </div>
                    <div className="percentile-bar">
                        <div
                            className={`percentile-fill ${getPercentileStatus(heightPosition)}`}
                            style={{ width: `${heightPosition ?? 0}%` }}
                        />
                    </div>
                </div>

                <div className="growth-metric-box">
                    <div className="growth-metric-label">Head</div>
                    <div className="growth-metric-value">
                        {latestRecord?.head_cm ? `${parseFloat(latestRecord.head_cm).toFixed(1)} cm` : '--'}
                    </div>
                    <div className="growth-metric-percentile">--</div>
                    <div className="percentile-bar">
                        <div className="percentile-fill neutral" style={{ width: '0%' }} />
                    </div>
                </div>
            </div>

            {/* Inline Quick Entry */}
            {isAdding ? (
                <form onSubmit={handleSubmit} className="growth-quick-entry">
                    <input
                        type="number"
                        step="0.01"
                        placeholder={t('placeholder_kg')}
                        value={formData.weight}
                        onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                        className="growth-input"
                    />
                    <input
                        type="number"
                        step="0.1"
                        placeholder={t('placeholder_cm')}
                        value={formData.height}
                        onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                        className="growth-input"
                    />
                    <input
                        type="number"
                        step="0.1"
                        placeholder={t('placeholder_head')}
                        value={formData.head}
                        onChange={(e) => setFormData({ ...formData, head: e.target.value })}
                        className="growth-input"
                    />
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                        {saving ? '...' : 'Save'}
                    </button>
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => setIsAdding(false)}
                    >
                        Cancel
                    </button>
                </form>
            ) : (
                <button
                    className="growth-add-btn"
                    onClick={() => setIsAdding(true)}
                >
                    <Plus size={16} />
                    Log Measurement
                </button>
            )}

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

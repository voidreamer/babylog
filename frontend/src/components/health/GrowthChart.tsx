/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState, useCallback } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
} from 'recharts';
import { WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS, WHO_HEIGHT_BOYS, WHO_HEIGHT_GIRLS } from '../../data/whoGrowthData';
import { differenceInMonths, differenceInDays } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../../hooks/useUnits';

// Consistent chart colors — use CSS custom properties for theme awareness
const CHART_COLORS = {
    percentileLine: 'var(--growth-percentile, #8b7ec8)',
    percentileLineLight: 'var(--growth-percentile-light, rgba(139, 126, 200, 0.3))',
    percentileArea: 'var(--growth-percentile-area, rgba(139, 126, 200, 0.1))',
    baby: 'var(--primary)',
};

function toLocalDate(dateStr: string): Date {
    const datePart = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    return new Date(datePart + 'T12:00:00');
}

function getAgeMonths(birthDate: string, measurementDate: string): number {
    return differenceInMonths(toLocalDate(measurementDate), toLocalDate(birthDate));
}

/** Calculate which percentile a value falls at, given the WHO band values */
function calculatePercentile(value: number, whoRow: { p3: number; p15: number; p50: number; p85: number; p97: number } | undefined): number | null {
    if (!whoRow) return null;
    const bands: [number, number][] = [
        [whoRow.p3, 3],
        [whoRow.p15, 15],
        [whoRow.p50, 50],
        [whoRow.p85, 85],
        [whoRow.p97, 97],
    ];

    if (value <= bands[0][0]) return Math.max(1, Math.round(3 * (value / bands[0][0])));
    if (value >= bands[bands.length - 1][0]) return Math.min(99, 97 + Math.round(2 * ((value - bands[bands.length - 1][0]) / bands[bands.length - 1][0])));

    // Linear interpolation between bands
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

interface HealthGrowthChartProps { baby: any; growthRecords: any[]; }
export default function GrowthChart({ baby, growthRecords }: HealthGrowthChartProps) {
    const { t } = useTranslation('health');
    const { convertWeight, convertLength, weightUnit, lengthUnit } = useUnits();
    const [metric, setMetric] = useState('weight');
    const [selectedPoint, setSelectedPoint] = useState<{ ageMonths: number; value: number; percentile: number | null } | null>(null);

    const birthDate = baby?.birth_date;
    const gender = baby?.gender || 'boy';

    // Calculate current age in fractional months for the reference line
    const currentAgeMonths = useMemo(() => {
        if (!birthDate) return null;
        const days = differenceInDays(new Date(), toLocalDate(birthDate));
        const months = days / 30.44; // average days per month
        return months >= 0 && months <= 24 ? Math.round(months * 10) / 10 : null;
    }, [birthDate]);

    const whoData = useMemo(() => {
        if (metric === 'weight') {
            return gender === 'girl' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
        }
        return gender === 'girl' ? WHO_HEIGHT_GIRLS : WHO_HEIGHT_BOYS;
    }, [metric, gender]);

    const babyData = useMemo(() => {
        if (!growthRecords || !birthDate) return [];

        const points = growthRecords
            .filter(r => metric === 'weight' ? r.weight_kg : r.height_cm)
            .map(r => ({
                ageMonths: getAgeMonths(birthDate, r.recorded_date),
                value: metric === 'weight' ? r.weight_kg : r.height_cm,
                date: r.recorded_date,
            }))
            .filter(r => r.ageMonths >= 0 && r.ageMonths <= 24)
            .sort((a, b) => a.ageMonths - b.ageMonths);

        const byMonth = new Map<number, typeof points[0]>();
        for (const p of points) {
            byMonth.set(p.ageMonths, p);
        }
        return Array.from(byMonth.values()).sort((a, b) => a.ageMonths - b.ageMonths);
    }, [growthRecords, birthDate, metric]);

    const conv = metric === 'weight' ? convertWeight : convertLength;

    const chartData = useMemo(() => {
        const data: any[] = whoData.map(row => ({
            ageMonths: row.months,
            p3: row.p3 != null ? conv(row.p3) : null,
            p15: row.p15 != null ? conv(row.p15) : null,
            p50: row.p50 != null ? conv(row.p50) : null,
            p85: row.p85 != null ? conv(row.p85) : null,
            p97: row.p97 != null ? conv(row.p97) : null,
            babyValue: null,
            // Keep raw WHO values for percentile calculation
            _whoRaw: row,
            _babyRaw: null as number | null,
        }));

        babyData.forEach(point => {
            const displayValue = conv(point.value);
            const existing = data.find(d => d.ageMonths === point.ageMonths);
            if (existing) {
                existing.babyValue = displayValue;
                existing._babyRaw = point.value;
            } else {
                const insertIdx = data.findIndex(d => d.ageMonths > point.ageMonths);
                const newPoint = { ageMonths: point.ageMonths, babyValue: displayValue, _babyRaw: point.value };
                if (insertIdx === -1) {
                    data.push(newPoint);
                } else {
                    data.splice(insertIdx, 0, newPoint);
                }
            }
        });

        return data;
    }, [whoData, babyData, conv]);

    const unit = metric === 'weight' ? weightUnit : lengthUnit;

    const handleChartClick = useCallback((data: any) => {
        if (!data?.activePayload?.[0]) {
            setSelectedPoint(null);
            return;
        }
        const point = data.activePayload[0].payload;
        if (point.babyValue != null && point._babyRaw && point._whoRaw) {
            const percentile = calculatePercentile(point._babyRaw, point._whoRaw);
            setSelectedPoint({ ageMonths: point.ageMonths, value: point.babyValue, percentile });
        } else {
            setSelectedPoint(null);
        }
    }, []);

    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0]?.payload;
        if (!data) return null;

        // Calculate percentile if baby data exists at this point
        let percentile: number | null = null;
        if (data._babyRaw && data._whoRaw) {
            percentile = calculatePercentile(data._babyRaw, data._whoRaw);
        }

        return (
            <div className="growth-chart-tooltip">
                <div className="growth-chart-tooltip-title">
                    {data.ageMonths} {t('growth.months')}
                </div>
                {data.babyValue != null && (
                    <div className="growth-chart-tooltip-baby">
                        {t('growth.baby', { value: data.babyValue, unit })}
                        {percentile != null && (
                            <span className="growth-chart-tooltip-percentile">
                                {' '}— {t('growth.percentile', { value: percentile, defaultValue: '{{value}}th percentile' })}
                            </span>
                        )}
                    </div>
                )}
                {data.p50 != null && (
                    <div className="growth-chart-tooltip-ref">
                        {t('growth.median', { value: data.p50?.toFixed(1), unit, defaultValue: 'Median: {{value}}{{unit}}' })}
                    </div>
                )}
                {data.p3 != null && data.p97 != null && (
                    <div className="growth-chart-tooltip-ref">
                        {t('growth.range', {
                            low: data.p3?.toFixed(1),
                            high: data.p97?.toFixed(1),
                            unit,
                            defaultValue: 'Normal range: {{low}}–{{high}}{{unit}}'
                        })}
                    </div>
                )}
            </div>
        );
    };

    if (!birthDate) {
        return (
            <div className="growth-chart-empty">
                {t('growth.addBirthDate')}
            </div>
        );
    }

    return (
        <div className="growth-chart">
            <div className="growth-chart-header">
                <h4>{metric === 'weight' ? t('growth.weightForAge') : t('growth.heightForAge')}</h4>
                <div className="growth-chart-tabs">
                    <button
                        className={`growth-chart-tab ${metric === 'weight' ? 'active' : ''}`}
                        onClick={() => setMetric('weight')}
                    >
                        {t('growth.weight')}
                    </button>
                    <button
                        className={`growth-chart-tab ${metric === 'height' ? 'active' : ''}`}
                        onClick={() => setMetric('height')}
                    >
                        {t('growth.height')}
                    </button>
                </div>
            </div>

            <div className="growth-chart-subtitle">
                {t('growth.whoStandards', { gender: gender === 'girl' ? t('growth.girls') : t('growth.boys') })}
            </div>

            {babyData.length === 0 ? (
                <div className="growth-chart-empty">
                    {metric === 'weight' ? t('growth.noWeightData') : t('growth.noHeightData')}
                </div>
            ) : (
                <>
                    <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }} onClick={handleChartClick}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />

                            <XAxis
                                dataKey="ageMonths"
                                stroke="var(--text-muted)"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(v) => `${v}m`}
                            />

                            <YAxis
                                stroke="var(--text-muted)"
                                tick={{ fontSize: 12 }}
                                tickFormatter={(v) => `${v}${unit}`}
                                domain={['auto', 'auto']}
                            />

                            <Tooltip content={<CustomTooltip />} />

                            {/* Percentile range shading (3rd to 97th) */}
                            <Area
                                dataKey="p97"
                                stroke="none"
                                fill={CHART_COLORS.percentileArea}
                                fillOpacity={1}
                            />
                            <Area
                                dataKey="p3"
                                stroke="none"
                                fill="var(--background)"
                                fillOpacity={1}
                            />

                            {/* Percentile lines */}
                            <Line
                                dataKey="p3"
                                stroke={CHART_COLORS.percentileLineLight}
                                strokeWidth={1}
                                dot={false}
                                strokeDasharray="4 4"
                                name="3rd"
                            />
                            <Line
                                dataKey="p50"
                                stroke={CHART_COLORS.percentileLine}
                                strokeWidth={2}
                                dot={false}
                                name="50th"
                            />
                            <Line
                                dataKey="p97"
                                stroke={CHART_COLORS.percentileLineLight}
                                strokeWidth={1}
                                dot={false}
                                strokeDasharray="4 4"
                                name="97th"
                            />

                            {/* Current age indicator line */}
                            {currentAgeMonths != null && (
                                <ReferenceLine
                                    x={currentAgeMonths}
                                    stroke="var(--primary)"
                                    strokeDasharray="4 4"
                                    strokeWidth={1.5}
                                    label={{
                                        value: t('growth.now', { defaultValue: 'Now' }),
                                        position: 'top',
                                        fill: 'var(--primary)',
                                        fontSize: 11,
                                        fontWeight: 600,
                                    }}
                                />
                            )}

                            {/* Baby's data */}
                            <Line
                                dataKey="babyValue"
                                stroke={CHART_COLORS.baby}
                                strokeWidth={2}
                                dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 5 }}
                                activeDot={{ fill: 'var(--primary)', strokeWidth: 2, r: 7, cursor: 'pointer' }}
                                connectNulls={true}
                                name="Baby"
                            />
                        </ComposedChart>
                    </ResponsiveContainer>

                    {/* Selected point percentile display */}
                    {selectedPoint && (
                        <div className="growth-chart-selected">
                            <span className="growth-chart-selected-age">
                                {selectedPoint.ageMonths} {t('growth.months')}
                            </span>
                            <span className="growth-chart-selected-value">
                                {selectedPoint.value} {unit}
                            </span>
                            {selectedPoint.percentile != null && (
                                <span className="growth-chart-selected-percentile">
                                    {t('growth.percentile', { value: selectedPoint.percentile, defaultValue: '{{value}}th percentile' })}
                                </span>
                            )}
                        </div>
                    )}

                    <div className="growth-chart-legend">
                        <span className="growth-chart-legend-item">
                            <span className="growth-chart-legend-dot baby"></span>
                            {t('growth.yourBaby')}
                        </span>
                        <span className="growth-chart-legend-item">
                            <span className="growth-chart-legend-line"></span>
                            {t('growth.fiftiethPercentile')}
                        </span>
                        <span className="growth-chart-legend-item">
                            <span className="growth-chart-legend-range"></span>
                            {t('growth.thirdToNinetySeventh')}
                        </span>
                    </div>
                </>
            )}
        </div>
    );
}

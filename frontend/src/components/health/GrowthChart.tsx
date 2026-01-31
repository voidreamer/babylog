/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo, useState } from 'react';
import {
    ResponsiveContainer,
    ComposedChart,
    Area,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
} from 'recharts';
import { WHO_WEIGHT_BOYS, WHO_WEIGHT_GIRLS, WHO_HEIGHT_BOYS, WHO_HEIGHT_GIRLS } from '../../data/whoGrowthData';
import { differenceInMonths } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../../hooks/useUnits';

// Calculate age in months from birth date to measurement date
function getAgeMonths(birthDate: string, measurementDate: string): number {
    const birth = new Date(birthDate);
    const measurement = new Date(measurementDate);
    return differenceInMonths(measurement, birth);
}

interface HealthGrowthChartProps { baby: any; growthRecords: any[]; }
export default function GrowthChart({ baby, growthRecords }: HealthGrowthChartProps) {
    const { t } = useTranslation('health');
    const { convertWeight, convertLength, weightUnit, lengthUnit, isImperial } = useUnits();
    const [metric, setMetric] = useState('weight'); // 'weight' or 'height'

    const birthDate = baby?.birth_date;
    const gender = baby?.gender || 'boy';

    // Get appropriate WHO data based on metric and gender
    const whoData = useMemo(() => {
        if (metric === 'weight') {
            return gender === 'girl' ? WHO_WEIGHT_GIRLS : WHO_WEIGHT_BOYS;
        }
        return gender === 'girl' ? WHO_HEIGHT_GIRLS : WHO_HEIGHT_BOYS;
    }, [metric, gender]);

    // Process baby's data points
    const babyData = useMemo(() => {
        if (!growthRecords || !birthDate) return [];

        return growthRecords
            .filter(r => metric === 'weight' ? r.weight_kg : r.height_cm)
            .map(r => ({
                ageMonths: getAgeMonths(birthDate, r.recorded_date),
                value: metric === 'weight' ? r.weight_kg : r.height_cm,
                date: r.recorded_date,
            }))
            .filter(r => r.ageMonths >= 0 && r.ageMonths <= 24)
            .sort((a, b) => a.ageMonths - b.ageMonths);
    }, [growthRecords, birthDate, metric]);

    const conv = metric === 'weight' ? convertWeight : convertLength;

    // Combine WHO data with baby's data for charting
    const chartData = useMemo(() => {
        // Start with WHO data (convert to display units)
        const data: any[] = whoData.map(row => ({
            ageMonths: row.months,
            p3: row.p3 != null ? conv(row.p3) : null,
            p15: row.p15 != null ? conv(row.p15) : null,
            p50: row.p50 != null ? conv(row.p50) : null,
            p85: row.p85 != null ? conv(row.p85) : null,
            p97: row.p97 != null ? conv(row.p97) : null,
            babyValue: null,
        }));

        // Add baby's data points (convert to display units)
        babyData.forEach(point => {
            const displayValue = conv(point.value);
            const existing = data.find(d => d.ageMonths === point.ageMonths);
            if (existing) {
                existing.babyValue = displayValue;
            } else {
                // Insert at right position
                const insertIdx = data.findIndex(d => d.ageMonths > point.ageMonths);
                if (insertIdx === -1) {
                    data.push({ ageMonths: point.ageMonths, babyValue: displayValue });
                } else {
                    data.splice(insertIdx, 0, { ageMonths: point.ageMonths, babyValue: displayValue });
                }
            }
        });

        return data;
    }, [whoData, babyData, conv]);

    const unit = metric === 'weight' ? weightUnit : lengthUnit;
    const label = metric === 'weight' ? t('growth.weight') : t('growth.height');

    // Custom tooltip
    const CustomTooltip = ({ active, payload }: any) => {
        if (!active || !payload || !payload.length) return null;
        const data = payload[0]?.payload;
        if (!data) return null;

        return (
            <div className="growth-chart-tooltip">
                <div className="growth-chart-tooltip-title">{data.ageMonths} months</div>
                {data.babyValue && (
                    <div className="growth-chart-tooltip-baby">
                        {t('growth.baby', { value: data.babyValue, unit })}
                    </div>
                )}
                {data.p50 && (
                    <div className="growth-chart-tooltip-ref">
                        {t('growth.refPercentile', { value: data.p50?.toFixed(1), unit })}
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
                        <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
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
                                fill="rgba(139, 92, 246, 0.1)"
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
                                stroke="rgba(139, 92, 246, 0.3)"
                                strokeWidth={1}
                                dot={false}
                                strokeDasharray="4 4"
                            />
                            <Line
                                dataKey="p50"
                                stroke="rgba(139, 92, 246, 0.6)"
                                strokeWidth={2}
                                dot={false}
                            />
                            <Line
                                dataKey="p97"
                                stroke="rgba(139, 92, 246, 0.3)"
                                strokeWidth={1}
                                dot={false}
                                strokeDasharray="4 4"
                            />

                            {/* Baby's data line and points */}
                            <Line
                                dataKey="babyValue"
                                stroke="var(--primary)"
                                strokeWidth={2}
                                dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 5 }}
                                connectNulls={false}
                            />
                        </ComposedChart>
                    </ResponsiveContainer>

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

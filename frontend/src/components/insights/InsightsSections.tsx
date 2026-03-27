/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp, TrendingDown, Clock, Moon, Baby, Droplets,
    AlertCircle, CheckCircle2, Lock, Calendar, Minus, Activity
} from 'lucide-react';

// ============================================================================
// Utility Functions
// ============================================================================

export const formatTime24to12 = (time24: string | null): string | null => {
    if (!time24) return null;
    const [hours, minutes] = time24.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
};

export const formatPrediction = (prediction: any): { text: string; isPastDue: boolean } | null => {
    if (!prediction) return null;
    const minutes = prediction.in_minutes;
    if (minutes < 0) {
        return { text: 'past_due', isPastDue: true };
    }
    if (minutes < 60) {
        return { text: `in ${minutes} min`, isPastDue: false };
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return {
        text: `in ${hours}h ${mins > 0 ? `${mins}m` : ''}`.trim(),
        isPastDue: false
    };
};

export const formatNapPrediction = (prediction: any): { text: string; isPastDue?: boolean; isSleeping?: boolean } | null => {
    if (!prediction) return null;
    if (prediction.status === 'sleeping') {
        return { text: 'sleeping_now', isSleeping: true };
    }
    return formatPrediction(prediction);
};

export const getStatus = (value: number, benchmark: any): string => {
    if (!benchmark) return 'neutral';
    if (value < benchmark.min) return 'low';
    if (value > benchmark.max) return 'high';
    return 'good';
};

export const getPressureColor = (score: number): string => {
    if (score < 30) return 'var(--success)';
    if (score < 70) return 'var(--feeding)';
    return 'var(--danger)';
};

// ============================================================================
// Helper Components
// ============================================================================

export function TrendIcon({ trend }: { trend: string }) {
    const { t } = useTranslation('dashboard');
    if (trend === 'improving') return <TrendingUp size={16} className="trend-icon trend-up" />;
    if (trend === 'declining') return <TrendingDown size={16} className="trend-icon trend-down" />;
    return <Minus size={16} className="trend-icon trend-stable" />;
}

// ============================================================================
// Section Components
// ============================================================================

interface PredictionsSectionProps { predictions: any; isPremium: boolean; }
export function PredictionsSection({ predictions, isPremium }: PredictionsSectionProps) {
    const { t } = useTranslation('dashboard');
    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Clock size={18} />
                <span>{t('insights.predictions')}</span>
                {!isPremium && <Lock size={14} className="premium-lock" />}
            </h2>

            <div className={`insights-cards ${!isPremium ? 'premium-blur' : ''}`}>
                {predictions?.next_feeding && (
                    <motion.div
                        className="insight-card prediction-card"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                    >
                        <div className="insight-card-icon" style={{ color: 'var(--feeding)' }}>
                            <Baby size={24} />
                        </div>
                        <div className="insight-card-content">
                            <span className="insight-card-label">{t('insights.nextFeeding')}</span>
                            <span className="insight-card-value">
                                {formatPrediction(predictions.next_feeding)?.text}
                            </span>
                            {predictions.next_feeding.confidence && (
                                <span className="prediction-confidence">
                                    ± {predictions.next_feeding.confidence.range_minutes} min
                                    <span className="confidence-quality">
                                        {predictions.next_feeding.confidence.quality_label}
                                    </span>
                                </span>
                            )}
                            {predictions.next_feeding.past_due && (
                                <span className="insight-card-alert">{t('insights.mayBeHungry')}</span>
                            )}
                        </div>
                    </motion.div>
                )}

                {predictions?.next_nap && (
                    <motion.div
                        className={`insight-card prediction-card ${predictions.next_nap.status === 'sleeping' ? 'sleeping' : ''}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 }}
                    >
                        <div className="insight-card-icon" style={{ color: 'var(--sleep)' }}>
                            <Moon size={24} />
                        </div>
                        <div className="insight-card-content">
                            <span className="insight-card-label">{t('insights.nextNap')}</span>
                            <span className="insight-card-value">
                                {formatNapPrediction(predictions.next_nap)?.text}
                            </span>
                            {predictions.next_nap.status_label && predictions.next_nap.status !== 'sleeping' && (
                                <span className={`nap-status nap-status-${predictions.next_nap.status}`}>
                                    {predictions.next_nap.status_label}
                                </span>
                            )}
                            {predictions.next_nap.wake_window && (
                                <span className="wake-window-info">
                                    {t('insights.wakeWindow', { min: predictions.next_nap.wake_window.min, max: predictions.next_nap.wake_window.max })}
                                </span>
                            )}
                        </div>
                    </motion.div>
                )}

                {predictions?.sleep_pressure && (
                    <motion.div
                        className={`insight-card pressure-card pressure-${predictions.sleep_pressure.zone}`}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="pressure-gauge">
                            <svg viewBox="0 0 100 100" className="pressure-ring">
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke="var(--border)"
                                    strokeWidth="8"
                                />
                                <circle
                                    cx="50"
                                    cy="50"
                                    r="45"
                                    fill="none"
                                    stroke={getPressureColor(predictions.sleep_pressure.score)}
                                    strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${predictions.sleep_pressure.score * 2.83} 283`}
                                    transform="rotate(-90 50 50)"
                                />
                            </svg>
                            <div className="pressure-score">
                                {predictions.sleep_pressure.score}
                            </div>
                        </div>
                        <div className="insight-card-content">
                            <span className="insight-card-label">{t('insights.sleepPressure')}</span>
                            <span className="insight-card-value">
                                {predictions.sleep_pressure.label}
                            </span>
                            <span className="pressure-detail">
                                {t('insights.minutesAwake', { count: predictions.sleep_pressure.minutes_awake })}
                            </span>
                            <span className="pressure-recommendation">
                                {predictions.sleep_pressure.recommendation}
                            </span>
                        </div>
                    </motion.div>
                )}
            </div>

            {!isPremium && (
                <div className="premium-overlay">
                    <Lock size={20} />
                    <span>{t('insights.upgradeToSeePredictions')}</span>
                </div>
            )}
        </section>
    );
}

function PatternCard({ icon, color, label, value, detail }: { icon: React.ReactNode; color: string; label: string; value: string; detail?: string }) {
    return (
        <div className="pattern-card">
            <div className="pattern-card-icon" style={{ color }}>{icon}</div>
            <div className="pattern-card-body">
                <span className="pattern-card-label">{label}</span>
                <span className="pattern-card-value">{value}</span>
                {detail && <span className="pattern-card-detail">{detail}</span>}
            </div>
        </div>
    );
}

interface PatternsSectionProps { patterns: any; isPremium: boolean; }
export function PatternsSection({ patterns, isPremium }: PatternsSectionProps) {
    const { t } = useTranslation('dashboard');

    const patternItems: { icon: React.ReactNode; color: string; label: string; value: string; detail?: string }[] = [];

    // Sleep patterns
    if (patterns?.wake_interval_hours) {
        patternItems.push({
            icon: <Moon size={20} />,
            color: 'var(--sleep)',
            label: t('insights.wakesUp'),
            value: t('insights.everyHours', { hours: patterns.wake_interval_hours }),
            detail: t('insights.newbornWakePattern', { defaultValue: 'Typical for newborns — sleep cycles are short' }),
        });
    } else {
        if (patterns?.usual_wake_time) {
            patternItems.push({
                icon: <Clock size={20} />,
                color: 'var(--sleep)',
                label: t('insights.usuallyWakesUp'),
                value: formatTime24to12(patterns.usual_wake_time) || '',
                detail: t('insights.morningRoutine', { defaultValue: 'Average morning wake-up time' }),
            });
        }
        if (patterns?.usual_bedtime) {
            patternItems.push({
                icon: <Moon size={20} />,
                color: 'var(--sleep)',
                label: t('insights.usualBedtime'),
                value: formatTime24to12(patterns.usual_bedtime) || '',
                detail: t('insights.nightRoutine', { defaultValue: 'Average evening bedtime' }),
            });
        }
    }

    // Feeding patterns
    if (patterns?.avg_feeding_interval_hours) {
        const hours = patterns.avg_feeding_interval_hours;
        const feedsPerDay = Math.round(24 / hours * 10) / 10;
        patternItems.push({
            icon: <Baby size={20} />,
            color: 'var(--feeding)',
            label: t('insights.feedsEvery'),
            value: t('insights.hours', { hours }),
            detail: t('insights.feedsPerDayEst', { defaultValue: '~{{count}} feeds/day', count: feedsPerDay }),
        });
    }

    // Nap patterns
    if (patterns?.avg_nap_duration_minutes) {
        const mins = patterns.avg_nap_duration_minutes;
        const napLabel = mins >= 60
            ? `${Math.floor(mins / 60)}h ${mins % 60 > 0 ? `${mins % 60}m` : ''}`
            : `${mins}m`;
        patternItems.push({
            icon: <Clock size={20} />,
            color: 'var(--sleep)',
            label: t('insights.avgNapLength'),
            value: napLabel,
            detail: mins < 45
                ? t('insights.shortNaps', { defaultValue: 'Short naps are normal for younger babies' })
                : mins >= 90
                    ? t('insights.longNaps', { defaultValue: 'Great — longer naps mean deeper restorative sleep' })
                    : t('insights.normalNaps', { defaultValue: 'Healthy nap duration' }),
        });
    }

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <TrendingUp size={18} />
                <span>{t('insights.patterns')}</span>
                {!isPremium && <Lock size={14} className="premium-lock" />}
            </h2>

            <div className={`insights-patterns-grid ${!isPremium ? 'premium-blur' : ''}`}>
                {patternItems.map((item, i) => (
                    <PatternCard key={i} {...item} />
                ))}
                {patternItems.length === 0 && (
                    <p className="pattern-empty">{t('insights.noPatternsYet', { defaultValue: 'Not enough data to detect patterns yet' })}</p>
                )}
            </div>

            {!isPremium && (
                <div className="premium-overlay">
                    <Lock size={20} />
                    <span>{t('insights.upgradeToseePatterns')}</span>
                </div>
            )}
        </section>
    );
}

function getTrendSummary(trend: string, t: any): string {
    if (trend === 'improving') return t('insights.trendImprovingTip', { defaultValue: 'Keep up the good work — things are moving in the right direction' });
    if (trend === 'declining') return t('insights.trendDecliningTip', { defaultValue: 'This is worth monitoring — consider whether anything has changed recently' });
    return t('insights.trendStableTip', { defaultValue: 'Consistent patterns are a sign of a well-established routine' });
}

interface TrendsSectionProps { trends: any; isPremium: boolean; }
export function TrendsSection({ trends, isPremium }: TrendsSectionProps) {
    const { t } = useTranslation('dashboard');
    if (!trends || (trends.sleep?.trend === 'insufficient_data' && trends.feeding?.trend === 'insufficient_data')) {
        return null;
    }

    const trendItems = [
        { key: 'sleep', data: trends.sleep, icon: <Moon size={18} />, color: 'var(--sleep)', label: t('insights.sleep') },
        { key: 'feeding', data: trends.feeding, icon: <Baby size={18} />, color: 'var(--feeding)', label: t('insights.feeding') },
    ].filter(item => item.data && item.data.trend !== 'insufficient_data');

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Activity size={18} />
                <span>{t('insights.fourteenDayTrends')}</span>
                {!isPremium && <Lock size={14} className="premium-lock" />}
            </h2>

            <div className={`insights-trends ${!isPremium ? 'premium-blur' : ''}`}>
                {trendItems.map(item => (
                    <div key={item.key} className={`trend-card trend-${item.data.trend}`}>
                        <div className="trend-card-header">
                            <span style={{ color: item.color }}>{item.icon}</span>
                            <span className="trend-card-label">{item.label}</span>
                            <TrendIcon trend={item.data.trend} />
                        </div>
                        <div className="trend-card-value">{item.data.trend_label}</div>
                        <p className="trend-card-desc">{item.data.description}</p>
                        <p className="trend-card-tip">{getTrendSummary(item.data.trend, t)}</p>
                    </div>
                ))}
            </div>

            {!isPremium && (
                <div className="premium-overlay">
                    <Lock size={20} />
                    <span>{t('insights.upgradeToSeeTrends')}</span>
                </div>
            )}
        </section>
    );
}

function BenchmarkProgressBar({ actual, min, max, color }: { actual: number; min: number; max: number; color: string }) {
    // Show where 'actual' falls relative to the expected range
    const rangeSpan = max - min;
    const visualMin = Math.max(0, min - rangeSpan * 0.3);
    const visualMax = max + rangeSpan * 0.3;
    const totalSpan = visualMax - visualMin;
    const leftPct = ((min - visualMin) / totalSpan) * 100;
    const widthPct = ((max - min) / totalSpan) * 100;
    const markerPct = Math.max(0, Math.min(100, ((actual - visualMin) / totalSpan) * 100));
    const inRange = actual >= min && actual <= max;

    return (
        <div className="benchmark-progress">
            <div className="benchmark-progress-track">
                <div
                    className="benchmark-progress-range"
                    style={{ left: `${leftPct}%`, width: `${widthPct}%`, background: color }}
                />
                <div
                    className={`benchmark-progress-marker ${inRange ? 'in-range' : 'out-range'}`}
                    style={{ left: `${markerPct}%` }}
                />
            </div>
            <div className="benchmark-progress-labels">
                <span>{min}</span>
                <span className="benchmark-progress-actual" style={{ color: inRange ? 'var(--success)' : 'var(--danger)' }}>
                    {actual} {inRange ? '✓' : '!'}
                </span>
                <span>{max}</span>
            </div>
        </div>
    );
}

interface BenchmarksSectionProps { benchmarks: any; today_vs_average: any; }
export function BenchmarksSection({ benchmarks, today_vs_average }: BenchmarksSectionProps) {
    const { t } = useTranslation('dashboard');

    const items = [
        {
            icon: <Droplets size={20} />,
            color: 'var(--diaper)',
            label: t('insights.diapersToday'),
            actual: today_vs_average?.diapers?.wet_today || 0,
            benchmark: benchmarks?.diapers?.expected_wet_diapers,
            unit: t('insights.wet'),
            note: benchmarks?.diapers?.notes,
        },
        {
            icon: <Moon size={20} />,
            color: 'var(--sleep)',
            label: t('insights.sleepToday'),
            actual: today_vs_average?.sleep_hours?.today || 0,
            benchmark: benchmarks?.sleep?.expected_total_sleep_hours,
            unit: t('insights.hours_label'),
            note: benchmarks?.sleep?.notes,
        },
        {
            icon: <Baby size={20} />,
            color: 'var(--feeding)',
            label: t('insights.feedingsToday'),
            actual: today_vs_average?.feedings?.today || 0,
            benchmark: benchmarks?.feeding?.expected_feeds_per_day,
            unit: t('insights.feeds'),
            note: benchmarks?.feeding?.notes,
        },
    ];

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <CheckCircle2 size={18} />
                <span>{t('insights.ageGuidelines')}</span>
                <span className="age-badge">{t('insights.weeks', { count: benchmarks?.age_weeks })}</span>
            </h2>

            <div className="insights-benchmarks">
                {items.map((item, i) => {
                    const status = getStatus(item.actual, item.benchmark);
                    return (
                        <div key={i} className={`benchmark-card benchmark-${status}`}>
                            <div className="benchmark-header">
                                <span style={{ color: item.color }}>{item.icon}</span>
                                <span>{item.label}</span>
                                <div className={`benchmark-status ${status}`}>
                                    {status === 'good' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                </div>
                            </div>
                            {item.benchmark && (
                                <BenchmarkProgressBar
                                    actual={item.actual}
                                    min={item.benchmark.min}
                                    max={item.benchmark.max}
                                    color={item.color}
                                />
                            )}
                            {item.note && <p className="benchmark-note">{item.note}</p>}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

interface TodayVsAverageSectionProps { today_vs_average: any; }
export function TodayVsAverageSection({ today_vs_average }: TodayVsAverageSectionProps) {
    const { t } = useTranslation('dashboard');

    const items = [
        {
            icon: <Baby size={18} />,
            label: t('insights.feedings'),
            today: today_vs_average?.feedings?.today || 0,
            avg: today_vs_average?.feedings?.daily_avg || 0,
            color: 'var(--feeding)',
            unit: '',
        },
        {
            icon: <Droplets size={18} />,
            label: t('insights.diapers'),
            today: today_vs_average?.diapers?.today || 0,
            avg: today_vs_average?.diapers?.daily_avg || 0,
            color: 'var(--diaper)',
            unit: '',
        },
        {
            icon: <Moon size={18} />,
            label: t('insights.sleep'),
            today: today_vs_average?.sleep_hours?.today || 0,
            avg: today_vs_average?.sleep_hours?.daily_avg || 0,
            color: 'var(--sleep)',
            unit: 'h',
        },
    ];

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Calendar size={18} />
                <span>{t('insights.todayVsAverage')}</span>
            </h2>

            <div className="insights-comparison-list">
                {items.map((item, i) => {
                    const diff = item.today - item.avg;
                    const diffLabel = diff > 0 ? `+${Math.abs(diff).toFixed(1)}` : diff < 0 ? `${diff.toFixed(1)}` : '0';

                    return (
                        <div key={i} className="comparison-card">
                            <div className="comparison-card-header">
                                <span style={{ color: item.color }}>{item.icon}</span>
                                <span className="comparison-card-label">{item.label}</span>
                                <span className={`comparison-diff ${diff >= 0 ? 'positive' : 'negative'}`}>{diffLabel}</span>
                            </div>
                            <div className="comparison-bars">
                                <div className="comparison-bar-row">
                                    <span className="comparison-bar-label">{t('insights.todayLabel', { defaultValue: 'Today' })}</span>
                                    <div className="comparison-bar-track">
                                        <div
                                            className="comparison-bar-fill"
                                            style={{
                                                width: `${Math.max(item.today, item.avg, 1) > 0 ? (item.today / Math.max(item.today, item.avg, 1)) * 100 : 0}%`,
                                                background: item.color,
                                            }}
                                        />
                                    </div>
                                    <span className="comparison-bar-val">{item.today}{item.unit}</span>
                                </div>
                                <div className="comparison-bar-row">
                                    <span className="comparison-bar-label">{t('insights.avgLabel', { defaultValue: 'Avg' })}</span>
                                    <div className="comparison-bar-track">
                                        <div
                                            className="comparison-bar-fill avg"
                                            style={{
                                                width: `${Math.max(item.today, item.avg, 1) > 0 ? (item.avg / Math.max(item.today, item.avg, 1)) * 100 : 0}%`,
                                                background: item.color,
                                                opacity: 0.4,
                                            }}
                                        />
                                    </div>
                                    <span className="comparison-bar-val">{item.avg}{item.unit}/d</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

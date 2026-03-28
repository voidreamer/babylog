/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp, TrendingDown, Clock, Moon, Baby, Droplets,
    Lock, Calendar, Minus, Activity,
    ChevronDown
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

                {predictions?.sleep_pressure && (() => {
                    const sp = predictions.sleep_pressure;
                    const color = getPressureColor(sp.score);
                    return (
                        <motion.div
                            className={`pressure-banner pressure-${sp.zone}`}
                            initial={{ opacity: 0, y: 12 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            <div className="pressure-banner-top">
                                <div className="pressure-banner-label">
                                    <Moon size={16} style={{ color }} />
                                    <span>{t('insights.sleepPressure')}</span>
                                </div>
                                <span className="pressure-banner-status" style={{ color }}>
                                    {sp.label}
                                </span>
                            </div>
                            <div className="pressure-banner-bar-track">
                                <div
                                    className="pressure-banner-bar-fill"
                                    style={{ width: `${sp.score}%`, backgroundColor: color }}
                                />
                                <div
                                    className="pressure-banner-bar-thumb"
                                    style={{ left: `${sp.score}%`, borderColor: color }}
                                />
                            </div>
                            <div className="pressure-banner-meta">
                                <span className="pressure-banner-awake">
                                    {t('insights.minutesAwake', { count: sp.minutes_awake })}
                                </span>
                                <span className="pressure-banner-rec">
                                    {sp.recommendation}
                                </span>
                            </div>
                        </motion.div>
                    );
                })()}
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

    // Night vs day sleep blocks
    if (patterns?.night_sleep_avg_hours) {
        patternItems.push({
            icon: <Moon size={20} />,
            color: 'var(--sleep)',
            label: t('insights.nightSleepBlock', { defaultValue: 'Night sleep block' }),
            value: `~${patterns.night_sleep_avg_hours}h`,
            detail: patterns.longest_sleep_block_hours
                ? t('insights.longestStretch', { defaultValue: 'Longest stretch: {{hours}}h', hours: patterns.longest_sleep_block_hours })
                : undefined,
        });
    }
    if (patterns?.day_sleep_avg_hours) {
        patternItems.push({
            icon: <Clock size={20} />,
            color: 'var(--sleep)',
            label: t('insights.daySleepBlock', { defaultValue: 'Day nap avg' }),
            value: `~${patterns.day_sleep_avg_hours}h`,
            detail: undefined,
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

    const COLLAPSED_COUNT = 3;
    const [expanded, setExpanded] = useState(false);
    const hasMore = patternItems.length > COLLAPSED_COUNT;
    const visibleItems = expanded ? patternItems : patternItems.slice(0, COLLAPSED_COUNT);

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <TrendingUp size={18} />
                <span>{t('insights.patterns')}</span>
                {!isPremium && <Lock size={14} className="premium-lock" />}
            </h2>

            <div className={`insights-patterns-grid ${!isPremium ? 'premium-blur' : ''}`}>
                {visibleItems.map((item, i) => (
                    <PatternCard key={i} {...item} />
                ))}
                {patternItems.length === 0 && (
                    <p className="pattern-empty">{t('insights.noPatternsYet', { defaultValue: 'Not enough data to detect patterns yet' })}</p>
                )}
            </div>

            {hasMore && isPremium && (
                <button
                    className="patterns-toggle"
                    onClick={() => setExpanded(e => !e)}
                >
                    <span>{expanded
                        ? t('insights.showLess', { defaultValue: 'Show less' })
                        : t('insights.showAllPatterns', { defaultValue: `Show all ${patternItems.length} patterns` })
                    }</span>
                    <ChevronDown size={16} className={`patterns-toggle-icon ${expanded ? 'expanded' : ''}`} />
                </button>
            )}

            {!isPremium && (
                <div className="premium-overlay">
                    <Lock size={20} />
                    <span>{t('insights.upgradeToseePatterns')}</span>
                </div>
            )}
        </section>
    );
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

interface TodaySnapshotSectionProps { benchmarks: any; today_vs_average: any; }
export function TodaySnapshotSection({ benchmarks, today_vs_average }: TodaySnapshotSectionProps) {
    const { t } = useTranslation('dashboard');

    const items = [
        {
            icon: <Baby size={20} />,
            color: 'var(--feeding)',
            label: t('insights.feedings'),
            today: today_vs_average?.feedings?.today || 0,
            avg: today_vs_average?.feedings?.daily_avg || 0,
            benchmark: benchmarks?.feeding?.expected_feeds_per_day,
            unit: '',
        },
        {
            icon: <Moon size={20} />,
            color: 'var(--sleep)',
            label: t('insights.sleep'),
            today: today_vs_average?.sleep_hours?.today || 0,
            avg: today_vs_average?.sleep_hours?.daily_avg || 0,
            benchmark: benchmarks?.sleep?.expected_total_sleep_hours,
            unit: 'h',
        },
        {
            icon: <Droplets size={20} />,
            color: 'var(--diaper)',
            label: t('insights.diapers'),
            today: today_vs_average?.diapers?.today || 0,
            avg: today_vs_average?.diapers?.daily_avg || 0,
            benchmark: benchmarks?.diapers?.expected_wet_diapers,
            unit: '',
        },
    ];

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Calendar size={18} />
                <span>{t('insights.todaySnapshot', { defaultValue: "Today's Snapshot" })}</span>
                {benchmarks?.age_weeks && (
                    <span className="age-badge">{t('insights.weeks', { count: benchmarks.age_weeks })}</span>
                )}
            </h2>

            <div className="snapshot-grid">
                {items.map((item, i) => {
                    const diff = item.today - item.avg;
                    const diffLabel = diff > 0 ? `+${diff.toFixed(1)}` : diff < 0 ? `${diff.toFixed(1)}` : '0';
                    const maxVal = Math.max(item.today, item.avg, item.benchmark?.max || 0, 1);
                    const todayPct = (item.today / maxVal) * 100;
                    const rangePct = item.benchmark ? ((item.benchmark.max - item.benchmark.min) / maxVal) * 100 : 0;
                    const rangeLeftPct = item.benchmark ? ((item.benchmark.min) / maxVal) * 100 : 0;
                    const avgPct = (item.avg / maxVal) * 100;

                    return (
                        <div key={i} className="snapshot-card">
                            <div className="snapshot-card-header">
                                <span className="snapshot-card-icon" style={{ color: item.color }}>{item.icon}</span>
                                <span className="snapshot-card-label">{item.label}</span>
                                <span className={`snapshot-diff ${diff >= 0 ? 'positive' : 'negative'}`}>{diffLabel}</span>
                            </div>
                            <div className="snapshot-card-value">
                                <span className="snapshot-today">{item.today}{item.unit}</span>
                                <span className="snapshot-avg">avg {item.avg}{item.unit}/d</span>
                            </div>
                            <div className="snapshot-bar-track">
                                {item.benchmark && (
                                    <div
                                        className="snapshot-bar-range"
                                        style={{ left: `${rangeLeftPct}%`, width: `${rangePct}%` }}
                                    />
                                )}
                                <div
                                    className="snapshot-bar-fill"
                                    style={{ width: `${todayPct}%`, backgroundColor: item.color }}
                                />
                                <div
                                    className="snapshot-bar-avg"
                                    style={{ left: `${avgPct}%` }}
                                />
                            </div>
                            {item.benchmark && (
                                <span className="snapshot-range-label">
                                    {t('insights.expectedRange', { defaultValue: '{{min}}–{{max}} expected', min: item.benchmark.min, max: item.benchmark.max })}
                                </span>
                            )}
                        </div>
                    );
                })}
            </div>
        </section>
    );
}

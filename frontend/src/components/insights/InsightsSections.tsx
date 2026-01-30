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
        return { text: 'Past due', isPastDue: true };
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
        return { text: 'Sleeping now', isSleeping: true };
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
    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Clock size={18} />
                <span>Predictions</span>
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
                            <span className="insight-card-label">Next Feeding</span>
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
                                <span className="insight-card-alert">May be hungry!</span>
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
                            <span className="insight-card-label">Next Nap</span>
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
                                    Wake window: {predictions.next_nap.wake_window.min}-{predictions.next_nap.wake_window.max} min
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
                            <span className="insight-card-label">Sleep Pressure</span>
                            <span className="insight-card-value">
                                {predictions.sleep_pressure.label}
                            </span>
                            <span className="pressure-detail">
                                {predictions.sleep_pressure.minutes_awake} min awake
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
                    <span>Upgrade to see predictions</span>
                </div>
            )}
        </section>
    );
}

interface PatternsSectionProps { patterns: any; isPremium: boolean; }
export function PatternsSection({ patterns, isPremium }: PatternsSectionProps) {
    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <TrendingUp size={18} />
                <span>Patterns</span>
                {!isPremium && <Lock size={14} className="premium-lock" />}
            </h2>

            <div className={`insights-patterns ${!isPremium ? 'premium-blur' : ''}`}>
                {patterns?.wake_interval_hours ? (
                    <div className="pattern-item">
                        <span className="pattern-label">Wakes up</span>
                        <span className="pattern-value">Every {patterns.wake_interval_hours} hours</span>
                    </div>
                ) : (
                    <>
                        {patterns?.usual_wake_time && (
                            <div className="pattern-item">
                                <span className="pattern-label">Usually wakes up</span>
                                <span className="pattern-value">{formatTime24to12(patterns.usual_wake_time)}</span>
                            </div>
                        )}
                        {patterns?.usual_bedtime && (
                            <div className="pattern-item">
                                <span className="pattern-label">Usual bedtime</span>
                                <span className="pattern-value">{formatTime24to12(patterns.usual_bedtime)}</span>
                            </div>
                        )}
                    </>
                )}
                {patterns?.avg_feeding_interval_hours && (
                    <div className="pattern-item">
                        <span className="pattern-label">Feeds every</span>
                        <span className="pattern-value">{patterns.avg_feeding_interval_hours} hours</span>
                    </div>
                )}
                {patterns?.avg_nap_duration_minutes && (
                    <div className="pattern-item">
                        <span className="pattern-label">Avg nap length</span>
                        <span className="pattern-value">{patterns.avg_nap_duration_minutes} min</span>
                    </div>
                )}
            </div>

            {!isPremium && (
                <div className="premium-overlay">
                    <Lock size={20} />
                    <span>Upgrade to see patterns</span>
                </div>
            )}
        </section>
    );
}

interface TrendsSectionProps { trends: any; isPremium: boolean; }
export function TrendsSection({ trends, isPremium }: TrendsSectionProps) {
    if (!trends || (trends.sleep?.trend === 'insufficient_data' && trends.feeding?.trend === 'insufficient_data')) {
        return null;
    }

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Activity size={18} />
                <span>14-Day Trends</span>
                {!isPremium && <Lock size={14} className="premium-lock" />}
            </h2>

            <div className={`insights-trends ${!isPremium ? 'premium-blur' : ''}`}>
                {trends.sleep && trends.sleep.trend !== 'insufficient_data' && (
                    <div className={`trend-item trend-${trends.sleep.trend}`}>
                        <TrendIcon trend={trends.sleep.trend} />
                        <div className="trend-content">
                            <span className="trend-label">Sleep</span>
                            <span className="trend-value">{trends.sleep.trend_label}</span>
                        </div>
                        <span className="trend-description">{trends.sleep.description}</span>
                    </div>
                )}

                {trends.feeding && trends.feeding.trend !== 'insufficient_data' && (
                    <div className={`trend-item trend-${trends.feeding.trend}`}>
                        <TrendIcon trend={trends.feeding.trend} />
                        <div className="trend-content">
                            <span className="trend-label">Feeding</span>
                            <span className="trend-value">{trends.feeding.trend_label}</span>
                        </div>
                        <span className="trend-description">{trends.feeding.description}</span>
                    </div>
                )}
            </div>

            {!isPremium && (
                <div className="premium-overlay">
                    <Lock size={20} />
                    <span>Upgrade to see trends</span>
                </div>
            )}
        </section>
    );
}

interface BenchmarksSectionProps { benchmarks: any; today_vs_average: any; }
export function BenchmarksSection({ benchmarks, today_vs_average }: BenchmarksSectionProps) {
    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <CheckCircle2 size={18} />
                <span>Age Guidelines</span>
                <span className="age-badge">{benchmarks?.age_weeks} weeks</span>
            </h2>

            <div className="insights-benchmarks">
                {/* Diapers */}
                <div className="benchmark-card">
                    <div className="benchmark-header">
                        <Droplets size={20} style={{ color: 'var(--diaper)' }} />
                        <span>Diapers Today</span>
                    </div>
                    <div className="benchmark-comparison">
                        <div className="benchmark-actual">
                            <span className="benchmark-number">{today_vs_average?.diapers?.wet_today || 0}</span>
                            <span className="benchmark-label">wet</span>
                        </div>
                        <div className="benchmark-expected">
                            <span className="benchmark-range">
                                {benchmarks?.diapers?.expected_wet_diapers?.min}-
                                {benchmarks?.diapers?.expected_wet_diapers?.max}
                            </span>
                            <span className="benchmark-label">expected</span>
                        </div>
                        <div className={`benchmark-status ${getStatus(
                            today_vs_average?.diapers?.wet_today || 0,
                            benchmarks?.diapers?.expected_wet_diapers
                        )}`}>
                            {getStatus(
                                today_vs_average?.diapers?.wet_today || 0,
                                benchmarks?.diapers?.expected_wet_diapers
                            ) === 'good' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        </div>
                    </div>
                    <p className="benchmark-note">{benchmarks?.diapers?.notes}</p>
                </div>

                {/* Sleep */}
                <div className="benchmark-card">
                    <div className="benchmark-header">
                        <Moon size={20} style={{ color: 'var(--sleep)' }} />
                        <span>Sleep Today</span>
                    </div>
                    <div className="benchmark-comparison">
                        <div className="benchmark-actual">
                            <span className="benchmark-number">{today_vs_average?.sleep_hours?.today || 0}</span>
                            <span className="benchmark-label">hours</span>
                        </div>
                        <div className="benchmark-expected">
                            <span className="benchmark-range">
                                {benchmarks?.sleep?.expected_total_sleep_hours?.min}-
                                {benchmarks?.sleep?.expected_total_sleep_hours?.max}
                            </span>
                            <span className="benchmark-label">expected</span>
                        </div>
                    </div>
                    <p className="benchmark-note">{benchmarks?.sleep?.notes}</p>
                </div>

                {/* Feedings */}
                <div className="benchmark-card">
                    <div className="benchmark-header">
                        <Baby size={20} style={{ color: 'var(--feeding)' }} />
                        <span>Feedings Today</span>
                    </div>
                    <div className="benchmark-comparison">
                        <div className="benchmark-actual">
                            <span className="benchmark-number">{today_vs_average?.feedings?.today || 0}</span>
                            <span className="benchmark-label">feeds</span>
                        </div>
                        <div className="benchmark-expected">
                            <span className="benchmark-range">
                                {benchmarks?.feeding?.expected_feeds_per_day?.min}-
                                {benchmarks?.feeding?.expected_feeds_per_day?.max}
                            </span>
                            <span className="benchmark-label">expected</span>
                        </div>
                        <div className={`benchmark-status ${getStatus(
                            today_vs_average?.feedings?.today || 0,
                            benchmarks?.feeding?.expected_feeds_per_day
                        )}`}>
                            {getStatus(
                                today_vs_average?.feedings?.today || 0,
                                benchmarks?.feeding?.expected_feeds_per_day
                            ) === 'good' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                        </div>
                    </div>
                    <p className="benchmark-note">{benchmarks?.feeding?.notes}</p>
                </div>
            </div>
        </section>
    );
}

interface TodayVsAverageSectionProps { today_vs_average: any; }
export function TodayVsAverageSection({ today_vs_average }: TodayVsAverageSectionProps) {
    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Calendar size={18} />
                <span>Today vs. Your Average</span>
            </h2>

            <div className="insights-comparison-grid">
                <div className="comparison-item">
                    <span className="comparison-label">Feedings</span>
                    <div className="comparison-values">
                        <span className="comparison-today">{today_vs_average?.feedings?.today}</span>
                        <span className="comparison-vs">vs</span>
                        <span className="comparison-avg">{today_vs_average?.feedings?.daily_avg}/day</span>
                    </div>
                </div>
                <div className="comparison-item">
                    <span className="comparison-label">Diapers</span>
                    <div className="comparison-values">
                        <span className="comparison-today">{today_vs_average?.diapers?.today}</span>
                        <span className="comparison-vs">vs</span>
                        <span className="comparison-avg">{today_vs_average?.diapers?.daily_avg}/day</span>
                    </div>
                </div>
                <div className="comparison-item">
                    <span className="comparison-label">Sleep</span>
                    <div className="comparison-values">
                        <span className="comparison-today">{today_vs_average?.sleep_hours?.today}h</span>
                        <span className="comparison-vs">vs</span>
                        <span className="comparison-avg">{today_vs_average?.sleep_hours?.daily_avg}h/day</span>
                    </div>
                </div>
            </div>
        </section>
    );
}

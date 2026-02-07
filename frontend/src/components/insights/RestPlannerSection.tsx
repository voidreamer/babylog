/* eslint-disable @typescript-eslint/no-explicit-any */
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Coffee, Lock, Moon, Clock, AlertCircle } from 'lucide-react';

// =============================================================================
// Sub-components
// =============================================================================

function RestSummaryMessage({ summary }: { summary: any }) {
    const { t } = useTranslation('dashboard');
    if (!summary) return null;

    const key = summary.message_key;
    const nextIn = summary.next_rest_in_minutes;

    let icon = <Coffee size={24} />;
    let message = '';
    let accent = 'var(--sleep)';

    if (key === 'rest_now') {
        icon = <Moon size={24} />;
        message = t('insights.restNow');
        accent = 'var(--success)';
    } else if (key === 'rest_soon') {
        message = t('insights.restSoon', { minutes: nextIn });
        accent = 'var(--sleep)';
    } else if (key === 'rest_later') {
        message = t('insights.restLater', { minutes: nextIn });
        accent = 'var(--feeding)';
    } else {
        icon = <AlertCircle size={24} />;
        message = t('insights.noRestPredicted');
        accent = 'var(--text-muted)';
    }

    return (
        <motion.div
            className="rest-summary-card"
            style={{ borderLeftColor: accent }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="rest-summary-icon" style={{ color: accent }}>{icon}</div>
            <div className="rest-summary-text">
                <span className="rest-summary-message">{message}</span>
                {summary.total_rest_minutes_remaining > 0 && (
                    <span className="rest-summary-detail">
                        {t('insights.totalRestRemaining', { minutes: summary.total_rest_minutes_remaining })}
                        {' \u00b7 '}
                        {t('insights.restWindowCount', { count: summary.rest_windows_count })}
                    </span>
                )}
            </div>
        </motion.div>
    );
}

function RestTimeline({ windows, summary }: { windows: any[]; summary: any }) {
    if (!windows.length) return null;

    const now = new Date();
    const firstStart = new Date(windows[0].start);
    const lastEnd = new Date(windows[windows.length - 1].end);

    // Timeline span: from now to last window end (plus some buffer)
    const rangeStart = Math.min(now.getTime(), firstStart.getTime());
    const rangeEnd = lastEnd.getTime();
    const totalMs = rangeEnd - rangeStart;
    if (totalMs <= 0) return null;

    const pct = (ts: number) => Math.max(0, Math.min(100, ((ts - rangeStart) / totalMs) * 100));
    const nowPct = pct(now.getTime());

    const formatHM = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    const qualityColor = (q: string) => {
        if (q === 'great') return 'var(--success)';
        if (q === 'good') return 'var(--sleep)';
        return 'var(--tummy)';
    };

    return (
        <div className="rest-timeline">
            <div className="rest-timeline-bar">
                {windows.map((w: any, i: number) => {
                    const left = pct(new Date(w.start).getTime());
                    const right = pct(new Date(w.end).getTime());
                    const width = right - left;
                    return (
                        <div
                            key={i}
                            className="rest-timeline-block"
                            style={{
                                left: `${left}%`,
                                width: `${width}%`,
                                backgroundColor: qualityColor(w.quality),
                            }}
                        />
                    );
                })}
                <div className="rest-timeline-now" style={{ left: `${nowPct}%` }} />
            </div>
            <div className="rest-timeline-labels">
                <span>{formatHM(new Date(rangeStart))}</span>
                <span>{formatHM(new Date(rangeEnd))}</span>
            </div>
        </div>
    );
}

function RestWindowCard({ window: w, index }: { window: any; index: number }) {
    const { t } = useTranslation('dashboard');

    const qualityBorder = (q: string) => {
        if (q === 'great') return 'var(--success)';
        if (q === 'good') return 'var(--sleep)';
        return 'var(--tummy)';
    };

    const start = new Date(w.start);
    const end = new Date(w.end);
    const fmt = (d: Date) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    return (
        <motion.div
            className="rest-window-card"
            style={{ borderLeftColor: qualityBorder(w.quality) }}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
        >
            <div className="rest-window-header">
                <span className="rest-window-time">
                    <Clock size={14} />
                    {fmt(start)} &ndash; {fmt(end)}
                </span>
                <span className="rest-window-duration">{w.duration_minutes} min</span>
            </div>
            <div className="rest-window-badges">
                <span className={`rest-badge rest-confidence-${w.confidence}`}>
                    {t(`insights.confidence_${w.confidence}`)}
                </span>
                <span className={`rest-badge rest-quality-${w.quality}`}>
                    {t(`insights.quality_${w.quality}`)}
                </span>
                {w.is_current && (
                    <span className="rest-badge rest-current">
                        {t('insights.currentNap')}
                    </span>
                )}
            </div>
            {w.notes && w.notes.length > 0 && (
                <div className="rest-window-notes">
                    {w.notes.map((note: string, i: number) => (
                        <span key={i} className="rest-window-note">{t(`insights.${note}`)}</span>
                    ))}
                </div>
            )}
        </motion.div>
    );
}

// =============================================================================
// Main Section
// =============================================================================

interface RestPlannerSectionProps {
    restPlan: any;
    isPremium: boolean;
}

export default function RestPlannerSection({ restPlan, isPremium }: RestPlannerSectionProps) {
    const { t } = useTranslation('dashboard');

    if (!restPlan || !restPlan.patterns_used?.has_enough_data) {
        return null;
    }

    const { rest_windows, summary } = restPlan;

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Coffee size={18} />
                <span>{t('insights.restPlanner')}</span>
                {!isPremium && <Lock size={14} className="premium-lock" />}
            </h2>

            <div className={`rest-planner-content ${!isPremium ? 'premium-blur' : ''}`}>
                <RestSummaryMessage summary={summary} />
                <RestTimeline windows={rest_windows} summary={summary} />
                {rest_windows.length > 0 && (
                    <div className="rest-windows-grid">
                        {rest_windows.map((w: any, i: number) => (
                            <RestWindowCard key={i} window={w} index={i} />
                        ))}
                    </div>
                )}
                {restPlan.patterns_used && (
                    <div className="rest-patterns-meta">
                        {t('insights.basedOnDays', { days: restPlan.patterns_used.data_days })}
                    </div>
                )}
            </div>

            {!isPremium && (
                <div className="premium-overlay">
                    <Lock size={20} />
                    <span>{t('insights.upgradeToSeeRestPlanner')}</span>
                </div>
            )}
        </section>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { Coffee, Lock, Moon, Sun, Sunset, Clock, AlertCircle, Beaker, ChevronLeft, ChevronRight, Info } from 'lucide-react';

type RestMode = 'day' | 'evening' | 'night';

// =============================================================================
// Helpers
// =============================================================================

function pressureColor(pressure: number): string {
    if (pressure < 0.4) return 'var(--success)';
    if (pressure < 0.6) return 'var(--tummy)';
    if (pressure < 0.8) return 'var(--feeding)';
    return 'var(--danger)';
}

const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// =============================================================================
// Sub-components
// =============================================================================

function ModeBadge({ mode, boundaries }: { mode: RestMode; boundaries?: any }) {
    const { t } = useTranslation('dashboard');
    const icon = mode === 'night' ? <Moon size={14} /> : mode === 'evening' ? <Sunset size={14} /> : <Sun size={14} />;
    const label = t(`insights.mode_${mode}`);

    let hint: string | null = null;
    if (boundaries) {
        if (boundaries.learned) {
            const fmt = (h: number) => {
                const hh = Math.floor(h);
                const mm = Math.round((h - hh) * 60);
                return `${hh}:${String(mm).padStart(2, '0')}`;
            };
            hint = t('insights.boundariesLearned', {
                bedtime: fmt(boundaries.bedtime_hour),
                wake: fmt(boundaries.morning_wake_hour),
            });
        } else {
            hint = t('insights.boundariesDefault');
        }
    }

    return (
        <div className={`rest-mode-badge rest-mode-${mode}`} title={hint || undefined}>
            {icon}
            <span>{label}</span>
        </div>
    );
}

function EffectiveAwakeRow({ currentState }: { currentState: any }) {
    const { t } = useTranslation('dashboard');
    if (!currentState) return null;
    const lastDur = currentState.last_sleep_duration_min;
    const recovery = currentState.last_sleep_recovery_fraction;
    const effective = currentState.effective_minutes_awake;
    const wall = currentState.wall_minutes_awake;
    // Only show when last sleep was short (recovery < 1) AND we're currently awake
    if (recovery == null || recovery >= 0.99 || lastDur == null || currentState.is_sleeping) return null;
    if (effective == null || wall == null) return null;
    return (
        <div className="rest-effective-awake" title={t('insights.effectiveAwakeTooltip', { minutes: lastDur })}>
            <Info size={14} />
            <span>{t('insights.effectiveAwakeLabel')}: <strong>{effective} min</strong> ({wall} min wall-clock)</span>
        </div>
    );
}

function NightModeCard({ currentState, patterns }: { currentState: any; patterns: any }) {
    const { t } = useTranslation('dashboard');
    if (!currentState) return null;
    // Use the night-bucket optimal window for the back-to-sleep estimate
    const nightWw = patterns?.bucketed_wake_windows?.night;
    const remaining = nightWw
        ? Math.max(0, Math.round(nightWw.mean_minutes - (currentState.wall_minutes_awake ?? 0)))
        : null;
    return (
        <motion.div
            className="rest-summary-card rest-night-card"
            style={{ borderLeftColor: 'var(--sleep)' }}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="rest-summary-icon" style={{ color: 'var(--sleep)' }}>
                <Moon size={24} />
            </div>
            <div className="rest-summary-text">
                <span className="rest-summary-message">
                    {remaining != null
                        ? t('insights.nightModeBackToSleep', { minutes: remaining })
                        : t('insights.mode_night')}
                </span>
                <span className="rest-summary-detail">{t('insights.nightModeHint')}</span>
            </div>
        </motion.div>
    );
}

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

function RestTimeline({ windows }: { windows: any[] }) {
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
                <span>{formatTime(new Date(rangeStart))}</span>
                <span>{formatTime(new Date(rangeEnd))}</span>
            </div>
        </div>
    );
}

function SleepPressureBar({ pressure }: { pressure: number }) {
    const { t } = useTranslation('dashboard');
    const pct = Math.round(pressure * 100);
    const color = pressureColor(pressure);

    return (
        <div className="rest-pressure-indicator">
            <span>{t('insights.sleepPressureLabel')}</span>
            <div className="rest-pressure-bar">
                <div
                    className="rest-pressure-fill"
                    style={{ width: `${pct}%`, backgroundColor: color }}
                />
            </div>
            <span>{pct}%</span>
        </div>
    );
}

function SignalPills({ signals }: { signals: any }) {
    const { t } = useTranslation('dashboard');
    if (!signals) return null;

    const signalKeys = Object.keys(signals);
    if (!signalKeys.length) return null;

    const labelMap: Record<string, string> = {
        pattern: t('insights.signal_pattern'),
        pressure: t('insights.signal_pressure'),
        circadian: t('insights.signal_circadian'),
        feeding: t('insights.signal_feeding'),
    };

    return (
        <div className="rest-signals">
            {signalKeys.map(key => (
                <span key={key} className="rest-signal-pill">
                    {labelMap[key] || key}
                </span>
            ))}
        </div>
    );
}

function RestWindowCard({ window: w, direction }: { window: any; direction: number }) {
    const { t } = useTranslation('dashboard');

    const qualityBorder = (q: string) => {
        if (q === 'great') return 'var(--success)';
        if (q === 'good') return 'var(--sleep)';
        return 'var(--tummy)';
    };

    // Use time range if available, otherwise exact time
    const hasRange = w.start_range?.earliest && w.start_range?.latest;
    let timeDisplay: string;
    if (hasRange) {
        const earliest = new Date(w.start_range.earliest);
        const latest = new Date(w.start_range.latest);
        timeDisplay = t('insights.windowRange', {
            earliest: formatTime(earliest),
            latest: formatTime(latest),
        });
    } else {
        const start = new Date(w.start);
        const end = new Date(w.end);
        timeDisplay = `${formatTime(start)} \u2013 ${formatTime(end)}`;
    }

    // Confidence: numeric score or categorical fallback
    const confScore = w.confidence_score;
    const confClass = `rest-confidence-${w.confidence}`;

    return (
        <motion.div
            className="rest-window-card"
            style={{ borderLeftColor: qualityBorder(w.quality) }}
            initial={{ opacity: 0, x: direction * 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -60 }}
            transition={{ duration: 0.25 }}
        >
            <div className="rest-window-header">
                <span className="rest-window-time">
                    <Clock size={14} />
                    {timeDisplay}
                </span>
                <span className="rest-window-duration">{w.duration_minutes} min</span>
            </div>
            <div className="rest-window-badges">
                <span className={`rest-badge ${confClass}`}>
                    {confScore != null
                        ? t('insights.confidenceScore', { score: confScore })
                        : t(`insights.confidence_${w.confidence}`)}
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
            {w.sleep_pressure_at_start != null && !w.is_current && (
                <SleepPressureBar pressure={w.sleep_pressure_at_start} />
            )}
            {w.signals && <SignalPills signals={w.signals} />}
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

function RestWindowCarousel({ windows }: { windows: any[] }) {
    const [index, setIndex] = useState(0);
    const [direction, setDirection] = useState(1);

    if (!windows.length) return null;

    const prev = () => {
        setDirection(-1);
        setIndex(i => Math.max(0, i - 1));
    };
    const next = () => {
        setDirection(1);
        setIndex(i => Math.min(windows.length - 1, i + 1));
    };

    return (
        <div className="rest-carousel">
            <button
                className="rest-carousel-arrow rest-carousel-prev"
                onClick={prev}
                disabled={index === 0}
                aria-label="Previous window"
            >
                <ChevronLeft size={20} />
            </button>
            <div className="rest-carousel-viewport">
                <AnimatePresence mode="wait" initial={false}>
                    <RestWindowCard
                        key={index}
                        window={windows[index]}
                        direction={direction}
                    />
                </AnimatePresence>
            </div>
            <button
                className="rest-carousel-arrow rest-carousel-next"
                onClick={next}
                disabled={index === windows.length - 1}
                aria-label="Next window"
            >
                <ChevronRight size={20} />
            </button>
            {windows.length > 1 && (
                <div className="rest-carousel-dots">
                    {windows.map((_: any, i: number) => (
                        <button
                            key={i}
                            className={`rest-carousel-dot ${i === index ? 'active' : ''}`}
                            onClick={() => { setDirection(i > index ? 1 : -1); setIndex(i); }}
                            aria-label={`Window ${i + 1}`}
                        />
                    ))}
                </div>
            )}
        </div>
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

    const { rest_windows, summary, current_state, mode, boundaries } = restPlan;
    const isNight: boolean = mode === 'night';

    return (
        <section className="insights-section">
            <h2 className="insights-section-title">
                <Coffee size={18} />
                <span>{t('insights.restPlanner')}</span>
                {mode && <ModeBadge mode={mode as RestMode} boundaries={boundaries} />}
                {!isPremium && <Lock size={14} className="premium-lock" />}
            </h2>

            <div className={`rest-planner-content ${!isPremium ? 'premium-blur' : ''}`}>
                {isNight ? (
                    <NightModeCard currentState={current_state} patterns={restPlan.patterns_used} />
                ) : (
                    <>
                        <RestSummaryMessage summary={summary} />
                        <EffectiveAwakeRow currentState={current_state} />
                        <RestTimeline windows={rest_windows} />
                        <RestWindowCarousel windows={rest_windows} />
                    </>
                )}
                {restPlan.patterns_used && (
                    <div className="rest-patterns-meta">
                        <span>{t('insights.basedOnDays', { days: restPlan.patterns_used.data_days })}</span>
                        <span className="rest-science-badge">
                            <Beaker size={12} />
                            {t('insights.poweredByScience')}
                        </span>
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

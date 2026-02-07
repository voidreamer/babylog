/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState, useEffect, useRef } from 'react';
import { Baby, Play, Square, Plus, Milk } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { hapticImpact, hapticNotification } from '../utils/haptics';
import { motion } from 'framer-motion';


// Format timer display
function formatTimer(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// Storage key for active feeding timer
const ACTIVE_FEEDING_KEY = 'activeFeeding';

interface FeedingWidgetProps { babyId: number; lastFeeding: any; onFeedingChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function FeedingWidget({ babyId, lastFeeding, onFeedingChange, onOpenModal, quickActionsEnabled = true }: FeedingWidgetProps) {
    const { t } = useTranslation('dashboard');
    const [saving, setSaving] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [activeFeeding, setActiveFeeding] = useState<any>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    // Load active feeding from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(ACTIVE_FEEDING_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Check if it's for the same baby
                if (parsed.babyId === babyId) {
                    setActiveFeeding(parsed);
                }
            } catch (e) {
                localStorage.removeItem(ACTIVE_FEEDING_KEY);
            }
        }
    }, [babyId]);

    // Timer effect
    useEffect(() => {
        if (activeFeeding) {
            const updateTimer = () => {
                const elapsed = Math.floor((Date.now() - activeFeeding.startTime) / 1000);
                setTimerSeconds(elapsed);
            };

            updateTimer();
            intervalRef.current = setInterval(updateTimer, 1000);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        } else {
            setTimerSeconds(0);
        }
    }, [activeFeeding]);

    const handleStartFeeding = (e: React.MouseEvent) => {
        e.stopPropagation();
        const feedMethod = localStorage.getItem('lastFeedMethod') || 'breast';
        const bottleType = localStorage.getItem('lastBottleType') || 'breastmilk';

        const newActiveFeeding = {
            babyId,
            startTime: Date.now(),
            feedMethod,
            bottleType,
        };

        setActiveFeeding(newActiveFeeding);
        localStorage.setItem(ACTIVE_FEEDING_KEY, JSON.stringify(newActiveFeeding));
        hapticImpact();
        toast.success(t('toast_feedingStarted'));
    };

    const handleStopFeeding = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeFeeding) return;

        setSaving(true);
        try {
            const durationMinutes = Math.ceil(timerSeconds / 60);
            const type = activeFeeding.feedMethod === 'breast'
                ? 'breast'
                : (activeFeeding.bottleType === 'formula' ? 'formula' : 'bottle');

            await api.createFeeding({
                baby_id: babyId,
                time: new Date(activeFeeding.startTime).toISOString(),
                type,
                duration_minutes: durationMinutes,
                amount_ml: null,
                notes: null,
            });

            localStorage.removeItem(ACTIVE_FEEDING_KEY);
            setActiveFeeding(null);
            hapticNotification();
            toast.success(t('feeding.feedingLogged', { duration: durationMinutes }));
            onFeedingChange();
        } catch (error) {
            console.error('Failed to save feeding:', error);
            toast.error(t('toast_failedToSaveFeeding'));
        } finally {
            setSaving(false);
        }
    };

    // Quick action handlers for one-tap logging
    const [quickSaving, setQuickSaving] = useState<string | null>(null);

    const handleQuickLog = async (type: 'breast' | 'formula' | 'bottle', amountMl: number | null, e: React.MouseEvent) => {
        e.stopPropagation();
        setQuickSaving(type);
        try {
            await api.createFeeding({
                baby_id: babyId,
                time: new Date().toISOString(),
                type,
                duration_minutes: null,
                amount_ml: amountMl,
                notes: null,
            });
            const label = type === 'breast' ? t('feeding.breast') : type === 'formula' ? t('feeding.formula') : t('feeding.breastBottle');
            hapticNotification();
            toast.success(t('feeding.quickLogged', { type: label }));
            onFeedingChange();
        } catch (error) {
            console.error('Failed to log feeding:', error);
            toast.error(t('toast_failedToSaveFeeding'));
        } finally {
            setQuickSaving(null);
        }
    };

    const isFeeding = !!activeFeeding;

    // Calculate end time from time + duration for "time ago" display
    // Shows how long since feeding ended, not when it started
    const getEndTime = () => {
        if (!lastFeeding) return null;
        const startDate = new Date(lastFeeding.time.endsWith('Z') ? lastFeeding.time : lastFeeding.time + 'Z');
        const endDate = new Date(startDate.getTime() + (lastFeeding.duration_minutes || 0) * 60000);
        return endDate.toISOString();
    };
    const timeAgo = lastFeeding ? formatTimeAgo(getEndTime()) : null;

    // Get display text for last feeding
    const getLastFeedingDetail = () => {
        if (!lastFeeding) return null;
        const typeMap: Record<string, string> = {
            breast: t('feeding.breast'),
            bottle: t('feeding.bottle'),
            breastmilk_bottle: t('feeding.breastBottle'),
            formula: t('feeding.formula'),
            solid: t('feeding.solid'),
        };
        const type = typeMap[lastFeeding.type] || lastFeeding.type;
        return lastFeeding.duration_minutes ? `${type} • ${lastFeeding.duration_minutes}min` : type;
    };

    return (
        <motion.div
            className={`widget feeding ${isFeeding ? 'active-timer' : ''}`}
            onClick={onOpenModal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {isFeeding && <div className="widget-glow" />}

            {/* Background icon */}
            <div className="widget-bg-icon">
                <img
                    src="/icons/feeding.png"
                    alt="feeding"
                    style={{ width: 80, height: 80, objectFit: 'contain' }}
                />
            </div>

            {/* Plus icon for manual logging */}
            <div className="widget-add-icon" title={t('title_logFeedingManually')}>
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img
                        src="/icons/feeding.png"
                        alt="feeding"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <span className="widget-label">{t('feeding.title')}</span>
                </div>

                {isFeeding ? (
                    /* Feeding in progress - always show timer */
                    <div className="feeding-widget-active">
                        <div className="feeding-timer">
                            <motion.span key={timerSeconds} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}>
                                {formatTimer(timerSeconds)}
                            </motion.span>
                        </div>
                        <button
                            className="feeding-stop-btn"
                            onClick={handleStopFeeding}
                            disabled={saving}
                        >
                            <Square size={14} fill="currentColor" />
                            {saving ? t('common:saving') : t('common:done')}
                        </button>
                    </div>
                ) : (
                    /* Display with quick actions */
                    <div className="feeding-widget-idle">
                        {lastFeeding ? (
                            <>
                                <div className="widget-time-ago">{timeAgo}</div>
                                <div className="widget-detail">{getLastFeedingDetail()}</div>
                            </>
                        ) : !quickActionsEnabled ? (
                            <div className="widget-time-ago">{t('feeding.noFeedingsYet')}</div>
                        ) : null}

                        {/* Quick action buttons */}
                        {quickActionsEnabled && (
                            <div className="feeding-quick-btns">
                                <button
                                    className="feeding-quick-btn breast"
                                    onClick={(e) => handleQuickLog('breast', null, e)}
                                    disabled={quickSaving !== null}
                                >
                                    <Baby size={14} />
                                    {quickSaving === 'breast' ? '...' : t('feeding.breast')}
                                </button>
                                <button
                                    className="feeding-quick-btn formula"
                                    onClick={(e) => handleQuickLog('formula', 60, e)}
                                    disabled={quickSaving !== null}
                                >
                                    <Milk size={14} />
                                    {quickSaving === 'formula' ? '...' : t('feeding.formula')}
                                </button>
                                <button
                                    className="feeding-quick-btn bottle"
                                    onClick={(e) => handleQuickLog('bottle', 60, e)}
                                    disabled={quickSaving !== null}
                                >
                                    <Milk size={14} />
                                    {quickSaving === 'bottle' ? '...' : t('feeding.breastBottle')}
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

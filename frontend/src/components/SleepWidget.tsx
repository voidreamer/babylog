/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState, useEffect } from 'react';
import { Moon, Sun, Plus, Clock } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { hapticImpact, hapticNotification } from '../utils/haptics';
import { motion } from 'framer-motion';

// Format elapsed time as "Xh Ym" or "Ym"
function formatElapsedTime(startTimeStr: string | null): string {
    if (!startTimeStr) return '';
    const startTime = new Date(startTimeStr.endsWith('Z') ? startTimeStr : startTimeStr + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - startTime.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}


interface SleepWidgetProps { babyId: number; currentSleep: any; lastSleep: any; onSleepChange: () => void; onOpenModal: () => void; }
export default function SleepWidget({ babyId, currentSleep, lastSleep, onSleepChange, onOpenModal }: SleepWidgetProps) {
    const { t } = useTranslation('dashboard');
    const [saving, setSaving] = useState(false);
    const [elapsed, setElapsed] = useState('');
    const isSleeping = !!currentSleep;

    // Update elapsed time every minute when sleeping
    useEffect(() => {
        if (!isSleeping) return;

        const updateElapsed = () => {
            setElapsed(formatElapsedTime(currentSleep.start_time));
        };

        updateElapsed();
        const interval = setInterval(updateElapsed, 60000);
        return () => clearInterval(interval);
    }, [isSleeping, currentSleep?.start_time]);

    const handleStartSleep = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setSaving(true);
        try {
            await api.createSleep({
                baby_id: babyId,
                start_time: new Date().toISOString(),
                end_time: null,
                notes: null,
            });
            hapticImpact();
            toast.success(t('toast_sleepStarted'));
            onSleepChange();
        } catch (error) {
            console.error('Failed to start sleep:', error);
            toast.error(t('toast_failedToStartSleep'));
        } finally {
            setSaving(false);
        }
    };

    const handleWakeUp = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!currentSleep) return;
        setSaving(true);
        try {
            await api.endSleep(currentSleep.id);
            hapticNotification();
            toast.success(t('toast_babyIsAwake'));
            onSleepChange();
        } catch (error) {
            console.error('Failed to end sleep:', error);
            toast.error(t('toast_failedToEndSleep'));
        } finally {
            setSaving(false);
        }
    };

    // Use end_time for "time ago" - shows how long since baby woke up, not when they fell asleep
    const timeAgo = lastSleep ? formatTimeAgo(lastSleep.end_time || lastSleep.start_time) : null;

    return (
        <motion.div
            className={`widget sleep ${isSleeping ? 'sleeping' : ''}`}
            onClick={onOpenModal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {isSleeping && <div className="widget-glow" />}

            {/* Background icon */}
            <div className="widget-bg-icon">
                <img
                    src="/icons/sleep.png"
                    alt="sleep"
                    style={{ width: 80, height: 80, objectFit: 'contain' }}
                />
            </div>

            {/* Plus icon for manual logging */}
            <div className="widget-add-icon" title={t('title_logCompletedSleep')}>
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img
                        src="/icons/sleep.png"
                        alt="sleep"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <span className="widget-label">{isSleeping ? t('sleep.sleeping') : t('sleep.title')}</span>
                </div>

                {isSleeping ? (
                    /* Sleeping state */
                    <div className="sleep-widget-sleeping">
                        <div className="sleep-elapsed">
                            <Clock size={14} />
                            <motion.span key={elapsed} initial={{ opacity: 0.6 }} animate={{ opacity: 1 }}>
                                {elapsed}
                            </motion.span>
                        </div>
                        <button
                            className="sleep-wake-btn"
                            onClick={handleWakeUp}
                            disabled={saving}
                        >
                            <Sun size={16} />
                            {saving ? t('sleep.waking') : t('sleep.wakeUp')}
                        </button>
                    </div>
                ) : (
                    /* Awake state */
                    <div className="sleep-widget-awake">
                        {lastSleep ? (
                            <div className="widget-time-ago">{timeAgo}</div>
                        ) : null}
                        <button
                            className="sleep-start-btn"
                            onClick={handleStartSleep}
                            disabled={saving}
                        >
                            <Moon size={16} />
                            {saving ? t('sleep.starting') : t('sleep.startSleep')}
                        </button>
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState, useEffect } from 'react';
import { Moon, Sun, Plus, Clock } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

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
    const { t } = useTranslation('common');
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
            toast.success(t('sleepStarted'));
            onSleepChange();
        } catch (error) {
            console.error('Failed to start sleep:', error);
            toast.error(t('errors.failedToSave'));
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
            toast.success(t('babyIsAwake'));
            onSleepChange();
        } catch (error) {
            console.error('Failed to end sleep:', error);
            toast.error(t('errors.failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    // Use end_time for "time ago" - shows how long since baby woke up, not when they fell asleep
    const timeAgo = lastSleep ? formatTimeAgo(lastSleep.end_time || lastSleep.start_time) : null;

    return (
        <div
            className={`widget sleep ${isSleeping ? 'sleeping' : ''}`}
            onClick={onOpenModal}
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
            <div className="widget-add-icon" title="Log completed sleep">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img
                        src="/icons/sleep.png"
                        alt="sleep"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <span className="widget-label">{isSleeping ? t('sleepStates.sleeping') : t('widgets.sleep')}</span>
                </div>

                {isSleeping ? (
                    /* Sleeping state */
                    <div className="sleep-widget-sleeping">
                        <div className="sleep-elapsed">
                            <Clock size={14} />
                            <span>{elapsed}</span>
                        </div>
                        <button
                            className="sleep-wake-btn"
                            onClick={handleWakeUp}
                            disabled={saving}
                        >
                            <Sun size={16} />
                            {saving ? t('waking') : t('wakeUp')}
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
                            {saving ? t('starting') : t('startSleep')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

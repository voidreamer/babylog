/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState, useEffect, useRef } from 'react';
import { Sun, Play, Square, Plus } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';


function formatTimer(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const ACTIVE_TUMMY_KEY = 'activeTummy';

interface TummyTimeWidgetProps { lastTummy: any; onTummyChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function TummyTimeWidget({ lastTummy, onTummyChange, onOpenModal, quickActionsEnabled = true }: TummyTimeWidgetProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [activeTummy, setActiveTummy] = useState<any>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (!selectedBaby) return;
        const stored = localStorage.getItem(ACTIVE_TUMMY_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.babyId === selectedBaby.id) {
                    setActiveTummy(parsed);
                }
            } catch (e) {
                localStorage.removeItem(ACTIVE_TUMMY_KEY);
            }
        }
    }, [selectedBaby]);

    useEffect(() => {
        if (activeTummy) {
            const updateTimer = () => {
                const elapsed = Math.floor((Date.now() - activeTummy.startTime) / 1000);
                setTimerSeconds(elapsed);
            };
            updateTimer();
            intervalRef.current = setInterval(updateTimer, 1000);
            return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
        } else {
            setTimerSeconds(0);
        }
    }, [activeTummy]);

    const handleStartTummy = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedBaby) return;
        const newActive = { babyId: selectedBaby.id, startTime: Date.now() };
        setActiveTummy(newActive);
        localStorage.setItem(ACTIVE_TUMMY_KEY, JSON.stringify(newActive));
        toast.success(t('toast_tummyTimeStarted'));
    };

    const handleStopTummy = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activeTummy || !selectedBaby) return;

        setSaving(true);
        try {
            const durationMinutes = Math.max(1, Math.ceil(timerSeconds / 60));

            await api.createTummyTime({
                baby_id: selectedBaby.id,
                start_time: new Date(activeTummy.startTime).toISOString(),
                duration_minutes: durationMinutes,
                notes: null,
            });

            localStorage.removeItem(ACTIVE_TUMMY_KEY);
            setActiveTummy(null);
            toast.success(t('tummyTime.tummyTimeLogged', { duration: durationMinutes }));
            onTummyChange();
        } catch (error) {
            console.error('Failed to save tummy time:', error);
            toast.error(t('toast_failedToSaveTummyTime'));
        } finally {
            setSaving(false);
        }
    };

    const isActive = !!activeTummy;

    // Calculate end time from start_time + duration for "time ago" display
    // Shows how long since tummy time ended, not when it started
    const getEndTime = () => {
        if (!lastTummy) return null;
        const startDate = new Date(lastTummy.start_time.endsWith('Z') ? lastTummy.start_time : lastTummy.start_time + 'Z');
        const endDate = new Date(startDate.getTime() + (lastTummy.duration_minutes || 0) * 60000);
        return endDate.toISOString();
    };
    const timeAgo = lastTummy ? formatTimeAgo(getEndTime()) : null;

    return (
        <motion.div
            className={`widget tummy ${isActive ? 'active-timer' : ''}`}
            onClick={onOpenModal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {isActive && <div className="widget-glow" />}

            <div className="widget-bg-icon">
                <Sun size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title={t('title_logTummyTimeManually')}>
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <Sun size={24} strokeWidth={2} />
                    <span className="widget-label">{t('tummyTime.tummy')}</span>
                </div>

                {isActive ? (
                    <div className="feeding-widget-active">
                        <div className="feeding-timer">{formatTimer(timerSeconds)}</div>
                        <button className="feeding-stop-btn" onClick={handleStopTummy} disabled={saving}>
                            <Square size={14} fill="currentColor" />
                            {saving ? t('common:saving') : t('common:done')}
                        </button>
                    </div>
                ) : quickActionsEnabled ? (
                    <div className="feeding-widget-idle">
                        {lastTummy ? (
                            <>
                                <div className="widget-time-ago">{timeAgo}</div>
                                <div className="widget-detail">{lastTummy.duration_minutes}min</div>
                            </>
                        ) : null}
                        <button className="feeding-start-btn" onClick={handleStartTummy} disabled={saving}>
                            <Play size={14} fill="currentColor" />
                            {t('tummyTime.start')}
                        </button>
                    </div>
                ) : (
                    <div className="feeding-widget-idle">
                        {lastTummy ? (
                            <>
                                <div className="widget-time-ago">{timeAgo}</div>
                                <div className="widget-detail">{lastTummy.duration_minutes}min</div>
                            </>
                        ) : (
                            <div className="widget-time-ago">{t('tummyTime.noTummyTimeYet')}</div>
                        )}
                    </div>
                )}
            </div>
        </motion.div>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState, useEffect, useRef } from 'react';
import { Clock, Square, Plus, Droplets } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { showApiError } from '../utils/errorHandling';
import { useBaby } from '../hooks/useBaby';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../hooks/useUnits';
import { hapticImpact, hapticNotification } from '../utils/haptics';
import { motion } from 'framer-motion';


function formatTimer(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const ACTIVE_PUMPING_KEY = 'activePumping';

interface PumpingWidgetProps { lastPumping: any; onPumpingChange: () => void; onOpenModal: () => void; quickActionsEnabled?: boolean; }
export default function PumpingWidget({ lastPumping, onPumpingChange, onOpenModal, quickActionsEnabled = true }: PumpingWidgetProps) {
    const { t } = useTranslation('dashboard');
    const { formatVolume } = useUnits();
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [activePumping, setActivePumping] = useState<any>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    useEffect(() => {
        if (!selectedBaby) return;
        const stored = localStorage.getItem(ACTIVE_PUMPING_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.babyId === selectedBaby.id) {
                    setActivePumping(parsed);
                }
            } catch (e) {
                localStorage.removeItem(ACTIVE_PUMPING_KEY);
            }
        }
    }, [selectedBaby]);

    useEffect(() => {
        if (activePumping) {
            const updateTimer = () => {
                const elapsed = Math.floor((Date.now() - activePumping.startTime) / 1000);
                setTimerSeconds(elapsed);
            };

            updateTimer();
            intervalRef.current = setInterval(updateTimer, 1000);

            return () => {
                if (intervalRef.current) clearInterval(intervalRef.current);
            };
        } else {
            setTimerSeconds(0);
        }
    }, [activePumping]);

    const [quickSaving, setQuickSaving] = useState(false);

    const handleQuickLog = async (amountMl: number, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        setQuickSaving(true);
        try {
            await api.createPumping({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                duration_minutes: null,
                amount_ml: amountMl,
                notes: null,
            });
            hapticNotification();
            toast.success(t('pumping.quickLogged', { amount: formatVolume(amountMl) }));
            onPumpingChange();
        } catch (error) {
            console.error('Failed to log pumping:', error);
            showApiError(error, t('toast_failedToSavePumping'), t);
        } finally {
            setQuickSaving(false);
        }
    };

    const handleStartPumping = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!selectedBaby) return;
        const newActivePumping = {
            babyId: selectedBaby.id,
            startTime: Date.now(),
        };
        setActivePumping(newActivePumping);
        localStorage.setItem(ACTIVE_PUMPING_KEY, JSON.stringify(newActivePumping));
        hapticImpact();
        toast.success(t('toast_pumpingStarted'));
    };

    const handleStopPumping = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!activePumping || !selectedBaby) return;

        setSaving(true);
        try {
            const durationMinutes = Math.ceil(timerSeconds / 60);

            await api.createPumping({
                baby_id: selectedBaby.id,
                time: new Date(activePumping.startTime).toISOString(),
                duration_minutes: durationMinutes,
                amount_ml: null,
                notes: null,
            });

            localStorage.removeItem(ACTIVE_PUMPING_KEY);
            setActivePumping(null);
            toast.success(t('pumping.pumpingLogged', { duration: durationMinutes }));
            onPumpingChange();
        } catch (error) {
            console.error('Failed to save pumping:', error);
            showApiError(error, t('toast_failedToSavePumping'), t);
        } finally {
            setSaving(false);
        }
    };

    const isPumping = !!activePumping;

    // Calculate end time from time + duration for "time ago" display
    // Shows how long since pumping ended, not when it started
    const getEndTime = () => {
        if (!lastPumping) return null;
        const startDate = new Date(lastPumping.time.endsWith('Z') ? lastPumping.time : lastPumping.time + 'Z');
        const endDate = new Date(startDate.getTime() + (lastPumping.duration_minutes || 0) * 60000);
        return endDate.toISOString();
    };
    const timeAgo = lastPumping ? formatTimeAgo(getEndTime()) : null;

    return (
        <motion.div
            className={`widget pumping ${isPumping ? 'active-timer' : ''}`}
            onClick={onOpenModal}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
        >
            {isPumping && <div className="widget-glow" />}

            <div className="widget-bg-icon">
                <img src={`${import.meta.env.BASE_URL}icons/pumping.png`} alt="pumping" style={{ width: 80, height: 80, objectFit: 'contain' }} />
            </div>

            <div className="widget-add-icon" title={t('title_logPumpingManually')}>
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img src={`${import.meta.env.BASE_URL}icons/pumping.png`} alt="pumping" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                    <span className="widget-label">{t('pumping.title')}</span>
                </div>

                {isPumping ? (
                    <div className="feeding-widget-active">
                        <div className="feeding-timer">{formatTimer(timerSeconds)}</div>
                        <button className="feeding-stop-btn" onClick={handleStopPumping} disabled={saving}>
                            <Square size={14} fill="currentColor" />
                            {saving ? t('common:saving') : t('common:done')}
                        </button>
                    </div>
                ) : (
                    <>
                        {lastPumping ? (
                            <>
                                <div className="widget-time-ago">{timeAgo}</div>
                                <div className="widget-detail">
                                    {lastPumping.amount_ml ? formatVolume(lastPumping.amount_ml) : null}
                                </div>
                            </>
                        ) : !quickActionsEnabled ? (
                            <div className="widget-time-ago">{t('pumping.noPumpingsYet')}</div>
                        ) : null}

                        {quickActionsEnabled && (
                            <div className="pumping-quick-btns">
                                <button
                                    className="pumping-quick-btn timer"
                                    onClick={handleStartPumping}
                                    disabled={saving}
                                    title={t('pumping.start')}
                                >
                                    <Clock size={14} />
                                    {t('pumping.start')}
                                </button>
                                <button
                                    className="pumping-quick-btn amount"
                                    onClick={(e) => handleQuickLog(60, e)}
                                    disabled={quickSaving || saving}
                                >
                                    <Droplets size={14} />
                                    {quickSaving ? '...' : formatVolume(60)}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </motion.div>
    );
}

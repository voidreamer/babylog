/* eslint-disable @typescript-eslint/no-explicit-any */
import { formatTimeAgo } from '../utils/formatTime';
import { useState, useEffect } from 'react';
import { Moon, Sun, Plus, Clock } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { useBaby } from '../hooks/useBaby';

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

/** Get age-appropriate sleep goal in hours based on birth date */
function getSleepGoalHours(birthDate: string | null): number {
    if (!birthDate) return 14; // default for newborn
    const birth = new Date(birthDate);
    const now = new Date();
    const ageMonths = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());

    if (ageMonths <= 3) return 15.5;  // 0-3mo: 14-17h, midpoint
    if (ageMonths <= 6) return 13.5;  // 4-6mo: 12-15h
    if (ageMonths <= 12) return 12.5; // 7-12mo: 11-14h
    return 12.5;                       // 1-2yr: 11-14h
}

/** Progress ring SVG component */
function SleepProgressRing({ sleepMinutes, goalHours, isSleeping }: { sleepMinutes: number; goalHours: number; isSleeping: boolean }) {
    const { t } = useTranslation('dashboard');
    const goalMinutes = goalHours * 60;
    const progress = Math.min(sleepMinutes / goalMinutes, 1);
    const size = 72;
    const strokeWidth = 5;
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference * (1 - progress);

    // Color logic
    let strokeColor: string;
    if (isSleeping) {
        strokeColor = 'var(--sleep, #6C9BCF)'; // blue
    } else if (progress >= 0.7) {
        strokeColor = '#4CAF50'; // green
    } else {
        strokeColor = '#FFC107'; // yellow
    }

    const hours = Math.floor(sleepMinutes / 60);
    const mins = sleepMinutes % 60;
    const sleepLabel = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

    return (
        <div className="sleep-progress-ring" style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
            <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
                {/* Background circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke="var(--border, #e0e0e0)"
                    strokeWidth={strokeWidth}
                    opacity={0.3}
                />
                {/* Progress arc */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="none"
                    stroke={strokeColor}
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={offset}
                    style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
                />
            </svg>
            <div style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1.1,
            }}>
                <span style={{ fontSize: '11px', fontWeight: 600 }}>{sleepLabel}</span>
                <span style={{ fontSize: '8px', opacity: 0.6 }}>{t('sleep.goalLabel', { hours: goalHours })}h</span>
            </div>
        </div>
    );
}


interface SleepWidgetProps { babyId: number; currentSleep: any; lastSleep: any; onSleepChange: () => void; onOpenModal: () => void; totalSleepMinutes?: number; }
export default function SleepWidget({ babyId, currentSleep, lastSleep, onSleepChange, onOpenModal, totalSleepMinutes = 0 }: SleepWidgetProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);
    const [elapsed, setElapsed] = useState('');
    const [currentNapMinutes, setCurrentNapMinutes] = useState(0);
    const isSleeping = !!currentSleep;

    const goalHours = getSleepGoalHours(selectedBaby?.birth_date ?? null);

    // Update elapsed time every minute when sleeping
    useEffect(() => {
        if (!isSleeping) return;

        const update = () => {
            setElapsed(formatElapsedTime(currentSleep.start_time));
            // Calculate current nap duration in minutes for ring
            const start = new Date(currentSleep.start_time.endsWith('Z') ? currentSleep.start_time : currentSleep.start_time + 'Z');
            setCurrentNapMinutes(Math.floor((Date.now() - start.getTime()) / 60000));
        };

        update();
        const interval = setInterval(update, 60000);
        return () => clearInterval(interval);
    }, [isSleeping, currentSleep?.start_time]);

    const effectiveSleepMinutes = totalSleepMinutes + (isSleeping ? currentNapMinutes : 0);

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
            toast.success(t('toast_babyIsAwake'));
            onSleepChange();
        } catch (error) {
            console.error('Failed to end sleep:', error);
            toast.error(t('toast_failedToEndSleep'));
        } finally {
            setSaving(false);
        }
    };

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
            <div className="widget-add-icon" title={t('title_logCompletedSleep')}>
                <Plus size={18} />
            </div>

            <div className="widget-content" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                {/* Progress Ring */}
                <SleepProgressRing
                    sleepMinutes={effectiveSleepMinutes}
                    goalHours={goalHours}
                    isSleeping={isSleeping}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="widget-icon-row">
                        <img
                            src="/icons/sleep.png"
                            alt="sleep"
                            style={{ width: 24, height: 24, objectFit: 'contain' }}
                        />
                        <span className="widget-label">{isSleeping ? t('sleep.sleeping') : t('sleep.title')}</span>
                    </div>

                    {isSleeping ? (
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
                                {saving ? t('sleep.waking') : t('sleep.wakeUp')}
                            </button>
                        </div>
                    ) : (
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
            </div>
        </div>
    );
}

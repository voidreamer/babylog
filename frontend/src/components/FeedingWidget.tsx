/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { Baby, Play, Square, Plus } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';

// Format time ago
function formatTimeAgo(dateStr: string | null): string | null {
    if (!dateStr) return null;
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours < 24) {
        return remainingMins > 0 ? `${diffHours}h ${remainingMins}m ago` : `${diffHours}h ago`;
    }

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

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
        toast.success('Feeding started');
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
            toast.success(`Feeding logged (${durationMinutes} min)`);
            onFeedingChange();
        } catch (error) {
            console.error('Failed to save feeding:', error);
            toast.error('Failed to save feeding');
        } finally {
            setSaving(false);
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
        const type = lastFeeding.type === 'bottle' || lastFeeding.type === 'breastmilk_bottle'
            ? 'Bottle'
            : lastFeeding.type.charAt(0).toUpperCase() + lastFeeding.type.slice(1);
        return lastFeeding.duration_minutes ? `${type} • ${lastFeeding.duration_minutes}min` : type;
    };

    return (
        <div
            className={`widget feeding ${isFeeding ? 'active-timer' : ''}`}
            onClick={onOpenModal}
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
            <div className="widget-add-icon" title="Log feeding manually">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img
                        src="/icons/feeding.png"
                        alt="feeding"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <span className="widget-label">{isFeeding ? 'Feeding' : 'Feeding'}</span>
                </div>

                {isFeeding ? (
                    /* Feeding in progress - always show timer */
                    <div className="feeding-widget-active">
                        <div className="feeding-timer">
                            {formatTimer(timerSeconds)}
                        </div>
                        <button
                            className="feeding-stop-btn"
                            onClick={handleStopFeeding}
                            disabled={saving}
                        >
                            <Square size={14} fill="currentColor" />
                            {saving ? 'Saving...' : 'Done'}
                        </button>
                    </div>
                ) : (
                    /* Simple display without quick actions */
                    <div className="feeding-widget-idle">
                        {lastFeeding ? (
                            <>
                                <div className="widget-time-ago">{timeAgo}</div>
                                <div className="widget-detail">{getLastFeedingDetail()}</div>
                            </>
                        ) : (
                            <div className="widget-time-ago">No feedings yet</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

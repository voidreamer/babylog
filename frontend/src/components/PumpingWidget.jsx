import { useState, useEffect, useRef } from 'react';
import { Heart, Play, Square, Plus } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';

function formatTimeAgo(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;

    const diffHours = Math.floor(diffMins / 60);
    const remainingMins = diffMins % 60;

    if (diffHours < 24) {
        return remainingMins > 0 ? `${diffHours}h ${remainingMins}m ago` : `${diffHours}h ago`;
    }

    return `${Math.floor(diffHours / 24)}d ago`;
}

function formatTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const ACTIVE_PUMPING_KEY = 'activePumping';

export default function PumpingWidget({ lastPumping, onPumpingChange, onOpenModal, quickActionsEnabled = true }) {
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [activePumping, setActivePumping] = useState(null);
    const intervalRef = useRef(null);
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

    const handleStartPumping = (e) => {
        e.stopPropagation();
        if (!selectedBaby) return;
        const newActivePumping = {
            babyId: selectedBaby.id,
            startTime: Date.now(),
        };
        setActivePumping(newActivePumping);
        localStorage.setItem(ACTIVE_PUMPING_KEY, JSON.stringify(newActivePumping));
        toast.success('Pumping started');
    };

    const handleStopPumping = async (e) => {
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
            toast.success(`Pumping logged (${durationMinutes} min)`);
            onPumpingChange();
        } catch (error) {
            console.error('Failed to save pumping:', error);
            toast.error('Failed to save pumping');
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
        <div
            className={`widget pumping ${isPumping ? 'active-timer' : ''}`}
            onClick={onOpenModal}
        >
            {isPumping && <div className="widget-glow" />}

            <div className="widget-bg-icon">
                <img src="/icons/pumping.png" alt="pumping" style={{ width: 80, height: 80, objectFit: 'contain' }} />
            </div>

            <div className="widget-add-icon" title="Log pumping manually">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img src="/icons/pumping.png" alt="pumping" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                    <span className="widget-label">Pumping</span>
                </div>

                {isPumping ? (
                    <div className="feeding-widget-active">
                        <div className="feeding-timer">{formatTimer(timerSeconds)}</div>
                        <button className="feeding-stop-btn" onClick={handleStopPumping} disabled={saving}>
                            <Square size={14} fill="currentColor" />
                            {saving ? 'Saving...' : 'Done'}
                        </button>
                    </div>
                ) : quickActionsEnabled ? (
                    <div className="feeding-widget-idle">
                        {lastPumping ? (
                            <>
                                <div className="widget-time-ago">{timeAgo}</div>
                                <div className="widget-detail">
                                    {lastPumping.amount_ml ? `${lastPumping.amount_ml}ml` : null}
                                </div>
                            </>
                        ) : null}
                        <button className="feeding-start-btn" onClick={handleStartPumping} disabled={saving}>
                            <Play size={14} fill="currentColor" />
                            Start
                        </button>
                    </div>
                ) : (
                    <div className="feeding-widget-idle">
                        {lastPumping ? (
                            <>
                                <div className="widget-time-ago">{timeAgo}</div>
                                <div className="widget-detail">
                                    {lastPumping.amount_ml ? `${lastPumping.amount_ml}ml` : null}
                                </div>
                            </>
                        ) : (
                            <div className="widget-time-ago">No pumpings yet</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

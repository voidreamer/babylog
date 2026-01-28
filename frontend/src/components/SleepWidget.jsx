import { useState, useEffect } from 'react';
import { Moon, Sun, Plus, Clock } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';

// Format elapsed time as "Xh Ym" or "Ym"
function formatElapsedTime(startTimeStr) {
    if (!startTimeStr) return '';
    const startTime = new Date(startTimeStr.endsWith('Z') ? startTimeStr : startTimeStr + 'Z');
    const now = new Date();
    const diffMs = now - startTime;
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 60) return `${diffMins}m`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

// Format time ago
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

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
}

export default function SleepWidget({ babyId, currentSleep, lastSleep, onSleepChange, onOpenModal }) {
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

    const handleStartSleep = async (e) => {
        e.stopPropagation();
        setSaving(true);
        try {
            await api.createSleep({
                baby_id: babyId,
                start_time: new Date().toISOString(),
                end_time: null,
                notes: null,
            });
            toast.success('Sleep started');
            onSleepChange();
        } catch (error) {
            console.error('Failed to start sleep:', error);
            toast.error('Failed to start sleep');
        } finally {
            setSaving(false);
        }
    };

    const handleWakeUp = async (e) => {
        e.stopPropagation();
        if (!currentSleep) return;
        setSaving(true);
        try {
            await api.endSleep(currentSleep.id);
            toast.success('Baby is awake!');
            onSleepChange();
        } catch (error) {
            console.error('Failed to end sleep:', error);
            toast.error('Failed to end sleep');
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
                    <span className="widget-label">{isSleeping ? 'Sleeping' : 'Sleep'}</span>
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
                            {saving ? 'Waking...' : 'Wake Up'}
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
                            {saving ? 'Starting...' : 'Start Sleep'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

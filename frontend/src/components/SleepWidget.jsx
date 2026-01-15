import { useState, useEffect, useMemo } from 'react';
import { Moon, Sun, Plus, Clock } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';

// Hook to detect if current theme is a dark theme
function useIsDarkTheme() {
    const [isDark, setIsDark] = useState(() => {
        const theme = document.documentElement.getAttribute('data-theme');
        return theme === 'handwritten-dark' || theme === 'classic';
    });

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const theme = document.documentElement.getAttribute('data-theme');
            setIsDark(theme === 'handwritten-dark' || theme === 'classic');
        });

        observer.observe(document.documentElement, {
            attributes: true,
            attributeFilter: ['data-theme']
        });

        return () => observer.disconnect();
    }, []);

    return isDark;
}

// Generate a subtle wobbly path for hand-drawn effect
function generateSketchyPath(width, height, seed, roughness = 1.5) {
    const points = 60;
    let path = 'M ';

    const wobble = (base, index) => {
        return base + Math.sin(seed + index * 0.4) * roughness + Math.cos(seed * 1.2 + index * 0.6) * roughness * 0.4;
    };

    for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        const y = wobble(0, i);
        path += `${x},${y} `;
    }

    for (let i = 0; i <= points; i++) {
        const x = wobble(width, i + points);
        const y = (i / points) * height;
        path += `${x},${y} `;
    }

    for (let i = points; i >= 0; i--) {
        const x = (i / points) * width;
        const y = wobble(height, i + points * 2);
        path += `${x},${y} `;
    }

    for (let i = points; i >= 0; i--) {
        const x = wobble(0, i + points * 3);
        const y = (i / points) * height;
        path += `${x},${y} `;
    }

    path += 'Z';
    return path;
}

// Sketchy border SVG component
function SketchyBorder({ width, height, seed }) {
    const paths = useMemo(() => ({
        main: generateSketchyPath(width, height, seed),
        second: generateSketchyPath(width, height, seed + 0.1),
        shadow: generateSketchyPath(width, height, seed + 0.5),
    }), [width, height, seed]);

    return (
        <>
            <svg
                className="sketchy-shadow"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
            >
                <path
                    d={paths.shadow}
                    fill="var(--widget-stroke)"
                    opacity="0.15"
                />
            </svg>

            <svg
                className="sketchy-border"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
            >
                <path
                    d={paths.main}
                    fill="var(--widget-bg)"
                />
                <path
                    d={paths.main}
                    fill="none"
                    stroke="var(--widget-stroke)"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.5"
                />
                <path
                    d={paths.second}
                    fill="none"
                    stroke="var(--widget-stroke)"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.25"
                />
            </svg>
        </>
    );
}

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

const sketchyColors = {
    sleep: { stroke: '#4f46e5', bg: '#eef2ff', text: '#3730a3' },
};

export default function SleepWidget({ babyId, currentSleep, lastSleep, onSleepChange, onOpenModal }) {
    const [saving, setSaving] = useState(false);
    const [elapsed, setElapsed] = useState('');
    const isDarkTheme = useIsDarkTheme();
    const colors = sketchyColors.sleep;
    const seed = 3 * 7.3; // Same seed as sleep widget in Widget.jsx

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

    const widgetStyle = isDarkTheme ? {} : {
        '--widget-stroke': colors.stroke,
        '--widget-bg': colors.bg,
        '--widget-text': colors.text
    };

    const timeAgo = lastSleep ? formatTimeAgo(lastSleep.start_time) : null;

    return (
        <div
            className={`widget sketchy sleep ${isSleeping ? 'sleeping' : ''}`}
            onClick={onOpenModal}
            style={widgetStyle}
        >
            <SketchyBorder width={200} height={150} seed={seed} />

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

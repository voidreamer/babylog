import { useState, useEffect, useRef, useMemo } from 'react';
import { Baby, Play, Square, Plus } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';

// Hook to detect if current theme is a dark theme
function useIsDarkTheme() {
    const [isDark, setIsDark] = useState(() => {
        const theme = document.documentElement.getAttribute('data-theme');
        return theme === 'dark';
    });

    useEffect(() => {
        const observer = new MutationObserver(() => {
            const theme = document.documentElement.getAttribute('data-theme');
            setIsDark(theme === 'dark');
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

// Format timer display
function formatTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const sketchyColors = {
    feeding: { stroke: '#ea580c', bg: '#fff7ed', text: '#9a3412' },
};

// Storage key for active feeding timer
const ACTIVE_FEEDING_KEY = 'activeFeeding';

export default function FeedingWidget({ babyId, lastFeeding, onFeedingChange, onOpenModal, quickActionsEnabled = true }) {
    const [saving, setSaving] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [activeFeeding, setActiveFeeding] = useState(null);
    const intervalRef = useRef(null);
    const isDarkTheme = useIsDarkTheme();
    const colors = sketchyColors.feeding;
    const seed = 1 * 7.3; // Same seed as feeding widget

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

    const handleStartFeeding = (e) => {
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

    const handleStopFeeding = async (e) => {
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

    const widgetStyle = isDarkTheme ? {} : {
        '--widget-stroke': colors.stroke,
        '--widget-bg': colors.bg,
        '--widget-text': colors.text
    };

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
            style={widgetStyle}
        >
            <SketchyBorder width={200} height={150} seed={seed} />

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

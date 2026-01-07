import { useState, useEffect, useRef, useMemo } from 'react';
import { Sun, Play, Square, Plus } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';

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
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
        return () => observer.disconnect();
    }, []);

    return isDark;
}

function generateSketchyPath(width, height, seed, roughness = 1.5) {
    const points = 60;
    let path = 'M ';
    const wobble = (base, index) => base + Math.sin(seed + index * 0.4) * roughness + Math.cos(seed * 1.2 + index * 0.6) * roughness * 0.4;

    for (let i = 0; i <= points; i++) { path += `${(i / points) * width},${wobble(0, i)} `; }
    for (let i = 0; i <= points; i++) { path += `${wobble(width, i + points)},${(i / points) * height} `; }
    for (let i = points; i >= 0; i--) { path += `${(i / points) * width},${wobble(height, i + points * 2)} `; }
    for (let i = points; i >= 0; i--) { path += `${wobble(0, i + points * 3)},${(i / points) * height} `; }
    return path + 'Z';
}

function SketchyBorder({ width, height, seed }) {
    const paths = useMemo(() => ({
        main: generateSketchyPath(width, height, seed),
        second: generateSketchyPath(width, height, seed + 0.1),
        shadow: generateSketchyPath(width, height, seed + 0.5),
    }), [width, height, seed]);

    return (
        <>
            <svg className="sketchy-shadow" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <path d={paths.shadow} fill="var(--widget-stroke)" opacity="0.15" />
            </svg>
            <svg className="sketchy-border" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                <path d={paths.main} fill="var(--widget-bg)" />
                <path d={paths.main} fill="none" stroke="var(--widget-stroke)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                <path d={paths.second} fill="none" stroke="var(--widget-stroke)" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.25" />
            </svg>
        </>
    );
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return null;
    const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + 'Z');
    const diffMins = Math.floor((new Date() - date) / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
}

function formatTimer(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

const sketchyColors = {
    tummy: { stroke: '#ca8a04', bg: '#fefce8', text: '#854d0e' },
};

const ACTIVE_TUMMY_KEY = 'activeTummy';

export default function TummyTimeWidget({ lastTummy, onTummyChange, onOpenModal, quickActionsEnabled = true }) {
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [activeTummy, setActiveTummy] = useState(null);
    const intervalRef = useRef(null);
    const isDarkTheme = useIsDarkTheme();
    const colors = sketchyColors.tummy;
    const seed = 6 * 7.3;

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

    const handleStartTummy = (e) => {
        e.stopPropagation();
        if (!selectedBaby) return;
        const newActive = { babyId: selectedBaby.id, startTime: Date.now() };
        setActiveTummy(newActive);
        localStorage.setItem(ACTIVE_TUMMY_KEY, JSON.stringify(newActive));
        toast.success('Tummy time started');
    };

    const handleStopTummy = async (e) => {
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
            toast.success(`Tummy time logged (${durationMinutes} min)`);
            onTummyChange();
        } catch (error) {
            console.error('Failed to save tummy time:', error);
            toast.error('Failed to save tummy time');
        } finally {
            setSaving(false);
        }
    };

    const isActive = !!activeTummy;
    const timeAgo = lastTummy ? formatTimeAgo(lastTummy.start_time) : null;

    const widgetStyle = isDarkTheme ? {} : {
        '--widget-stroke': colors.stroke,
        '--widget-bg': colors.bg,
        '--widget-text': colors.text
    };

    return (
        <div
            className={`widget sketchy tummy ${isActive ? 'active-timer' : ''}`}
            onClick={onOpenModal}
            style={widgetStyle}
        >
            <SketchyBorder width={200} height={150} seed={seed} />

            {isActive && <div className="widget-glow" />}

            <div className="widget-bg-icon">
                <Sun size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title="Log tummy time manually">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <Sun size={24} strokeWidth={2} />
                    <span className="widget-label">Tummy</span>
                </div>

                {isActive ? (
                    <div className="feeding-widget-active">
                        <div className="feeding-timer">{formatTimer(timerSeconds)}</div>
                        <button className="feeding-stop-btn" onClick={handleStopTummy} disabled={saving}>
                            <Square size={14} fill="currentColor" />
                            {saving ? 'Saving...' : 'Done'}
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
                            Start
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
                            <div className="widget-time-ago">No tummy time yet</div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

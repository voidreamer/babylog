import { useState, useEffect, useMemo } from 'react';
import { ShowerHead, Plus, Check } from 'lucide-react';
import { api } from '../api/client';
import { toast } from 'sonner';
import { useBaby } from '../hooks/useBaby';

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

const sketchyColors = {
    bath: { stroke: '#0891b2', bg: '#ecfeff', text: '#155e75' },
};

export default function BathWidget({ lastBath, onBathChange, onOpenModal, quickActionsEnabled = true }) {
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);
    const isDarkTheme = useIsDarkTheme();
    const colors = sketchyColors.bath;
    const seed = 7 * 7.3;

    const handleQuickLog = async (e) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            await api.createBath({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                notes: null,
            });
            toast.success('Bath logged');
            onBathChange();
        } catch (error) {
            console.error('Failed to log bath:', error);
            toast.error('Failed to log bath');
        } finally {
            setSaving(false);
        }
    };

    const timeAgo = lastBath ? formatTimeAgo(lastBath.time) : null;

    const widgetStyle = isDarkTheme ? {} : {
        '--widget-stroke': colors.stroke,
        '--widget-bg': colors.bg,
        '--widget-text': colors.text
    };

    return (
        <div
            className="widget bath"
            onClick={onOpenModal}
            style={widgetStyle}
        >
            <SketchyBorder width={200} height={150} seed={seed} />

            <div className="widget-bg-icon">
                <ShowerHead size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title="Log with notes">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <ShowerHead size={24} strokeWidth={2} />
                    <span className="widget-label">Bath</span>
                </div>

                <div className="feeding-widget-idle">
                    {lastBath ? (
                        <div className="widget-time-ago">{timeAgo}</div>
                    ) : !quickActionsEnabled ? (
                        <div className="widget-time-ago">No baths yet</div>
                    ) : null}
                    {quickActionsEnabled && (
                        <button className="feeding-start-btn" onClick={handleQuickLog} disabled={saving}>
                            <Check size={14} />
                            {saving ? 'Logging...' : 'Log Bath'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

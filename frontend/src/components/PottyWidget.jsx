import { useState, useEffect, useMemo } from 'react';
import { CircleDot, Plus, Check, X } from 'lucide-react';
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

const sketchyColors = {
    potty: { stroke: '#7c3aed', bg: '#f5f3ff', text: '#5b21b6' },
};

export default function PottyWidget({ lastPotty, onPottyChange, onOpenModal, quickActionsEnabled = true }) {
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(null);
    const isDarkTheme = useIsDarkTheme();
    const colors = sketchyColors.potty;
    const seed = 5 * 7.3;

    const handleQuickLog = async (result, e) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        setSaving(result);
        try {
            await api.createPottyLog({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                result,
                notes: null,
            });
            toast.success(`Potty ${result} logged`);
            onPottyChange();
        } catch (error) {
            console.error('Failed to log potty:', error);
            toast.error('Failed to log potty');
        } finally {
            setSaving(null);
        }
    };

    const timeAgo = lastPotty ? formatTimeAgo(lastPotty.time) : null;

    const widgetStyle = isDarkTheme ? {} : {
        '--widget-stroke': colors.stroke,
        '--widget-bg': colors.bg,
        '--widget-text': colors.text
    };

    return (
        <div
            className="widget sketchy potty"
            onClick={onOpenModal}
            style={widgetStyle}
        >
            <SketchyBorder width={200} height={150} seed={seed} />

            <div className="widget-bg-icon">
                <CircleDot size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title="Log with details">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <CircleDot size={24} strokeWidth={2} />
                    <span className="widget-label">Potty</span>
                </div>

                {lastPotty ? (
                    <>
                        <div className="widget-time-ago">{timeAgo}</div>
                        <div className="widget-detail">{lastPotty.result}</div>
                    </>
                ) : !quickActionsEnabled ? (
                    <div className="widget-time-ago">No potty logs yet</div>
                ) : null}

                {/* Quick action buttons */}
                {quickActionsEnabled && (
                    <div className="diaper-quick-btns">
                        <button
                            className="diaper-quick-btn pee"
                            onClick={(e) => handleQuickLog('success', e)}
                            disabled={saving !== null}
                            style={{ background: '#16a34a' }}
                        >
                            <Check size={14} />
                            {saving === 'success' ? '...' : 'Yes'}
                        </button>
                        <button
                            className="diaper-quick-btn poo"
                            onClick={(e) => handleQuickLog('attempt', e)}
                            disabled={saving !== null}
                            style={{ background: '#6b7280' }}
                        >
                            <X size={14} />
                            {saving === 'attempt' ? '...' : 'Try'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

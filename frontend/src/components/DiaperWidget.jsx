import { useState, useEffect, useMemo } from 'react';
import { Droplets, CircleDot, Plus } from 'lucide-react';
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
    diaper: { stroke: '#059669', bg: '#ecfdf5', text: '#065f46' },
};

export default function DiaperWidget({ babyId, lastDiaper, onDiaperChange, onOpenModal, quickActionsEnabled = true }) {
    const [saving, setSaving] = useState(null); // null or 'pee'|'poo'|'mixed'
    const isDarkTheme = useIsDarkTheme();
    const colors = sketchyColors.diaper;
    const seed = 2 * 7.3; // Same seed as diaper widget

    const handleQuickLog = async (type, e) => {
        e.stopPropagation();
        setSaving(type);
        try {
            await api.createDiaper({
                baby_id: babyId,
                time: new Date().toISOString(),
                type,
                poo_color: null,
                poo_consistency: null,
                poo_amount: null,
                notes: null,
            });
            toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} diaper logged`);
            onDiaperChange();
        } catch (error) {
            console.error('Failed to log diaper:', error);
            toast.error('Failed to log diaper');
        } finally {
            setSaving(null);
        }
    };

    const timeAgo = lastDiaper ? formatTimeAgo(lastDiaper.time) : null;

    const widgetStyle = isDarkTheme ? {} : {
        '--widget-stroke': colors.stroke,
        '--widget-bg': colors.bg,
        '--widget-text': colors.text
    };

    // Format last diaper type for display
    const getLastDiaperType = () => {
        if (!lastDiaper?.type) return null;
        const typeMap = { pee: 'Pee', poo: 'Poo', mixed: 'Both' };
        return typeMap[lastDiaper.type] || lastDiaper.type;
    };

    return (
        <div
            className="widget sketchy diaper"
            onClick={onOpenModal}
            style={widgetStyle}
        >
            <SketchyBorder width={200} height={150} seed={seed} />

            {/* Background icon */}
            <div className="widget-bg-icon">
                <img
                    src="/icons/diaper.png"
                    alt="diaper"
                    style={{ width: 80, height: 80, objectFit: 'contain' }}
                />
            </div>

            {/* Plus icon for full modal */}
            <div className="widget-add-icon" title="Log with details">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <img
                        src="/icons/diaper.png"
                        alt="diaper"
                        style={{ width: 24, height: 24, objectFit: 'contain' }}
                    />
                    <span className="widget-label">Diaper</span>
                </div>

                {lastDiaper ? (
                    <>
                        <div className="widget-time-ago">{timeAgo}</div>
                        <div className="widget-detail">{getLastDiaperType()}</div>
                    </>
                ) : !quickActionsEnabled ? (
                    <div className="widget-time-ago">No diapers yet</div>
                ) : null}

                {/* Quick action buttons */}
                {quickActionsEnabled && (
                    <div className="diaper-quick-btns">
                        <button
                            className="diaper-quick-btn pee"
                            onClick={(e) => handleQuickLog('pee', e)}
                            disabled={saving !== null}
                        >
                            <Droplets size={14} />
                            {saving === 'pee' ? '...' : 'Pee'}
                        </button>
                        <button
                            className="diaper-quick-btn poo"
                            onClick={(e) => handleQuickLog('poo', e)}
                            disabled={saving !== null}
                        >
                            <CircleDot size={14} />
                            {saving === 'poo' ? '...' : 'Poo'}
                        </button>
                        <button
                            className="diaper-quick-btn mixed"
                            onClick={(e) => handleQuickLog('mixed', e)}
                            disabled={saving !== null}
                        >
                            {saving === 'mixed' ? '...' : 'Both'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

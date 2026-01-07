import { useState, useEffect, useMemo } from 'react';
import { Pill, Plus, Check } from 'lucide-react';
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
    supplement: { stroke: '#16a34a', bg: '#f0fdf4', text: '#166534' },
};

export default function SupplementWidget({ lastSupplement, onSupplementChange, onOpenModal }) {
    const { selectedBaby } = useBaby();
    const [saving, setSaving] = useState(false);
    const isDarkTheme = useIsDarkTheme();
    const colors = sketchyColors.supplement;
    const seed = 8 * 7.3;

    // Get last used supplement or default to Vitamin D
    const getLastSupplementType = () => {
        return localStorage.getItem('lastSupplementType') || 'vitamin_d';
    };

    const handleQuickLog = async (e) => {
        e.stopPropagation();
        if (!selectedBaby) return;

        const supplementType = getLastSupplementType();
        setSaving(true);
        try {
            await api.createSupplement({
                baby_id: selectedBaby.id,
                time: new Date().toISOString(),
                name: supplementType,
                dosage: supplementType === 'vitamin_d' ? '400 IU' : null,
                notes: null,
            });
            localStorage.setItem('lastSupplementType', supplementType);
            toast.success('Supplement logged');
            onSupplementChange();
        } catch (error) {
            console.error('Failed to log supplement:', error);
            toast.error('Failed to log supplement');
        } finally {
            setSaving(false);
        }
    };

    const timeAgo = lastSupplement ? formatTimeAgo(lastSupplement.time) : null;
    const supplementLabel = lastSupplement?.name?.replace('_', ' ') || 'Vitamin D';

    const widgetStyle = isDarkTheme ? {} : {
        '--widget-stroke': colors.stroke,
        '--widget-bg': colors.bg,
        '--widget-text': colors.text
    };

    return (
        <div
            className="widget sketchy supplement"
            onClick={onOpenModal}
            style={widgetStyle}
        >
            <SketchyBorder width={200} height={150} seed={seed} />

            <div className="widget-bg-icon">
                <Pill size={80} strokeWidth={1} />
            </div>

            <div className="widget-add-icon" title="Log different supplement">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <Pill size={24} strokeWidth={2} />
                    <span className="widget-label">Supplement</span>
                </div>

                <div className="feeding-widget-idle">
                    {lastSupplement ? (
                        <>
                            <div className="widget-time-ago">{timeAgo}</div>
                            <div className="widget-detail">{supplementLabel}</div>
                        </>
                    ) : null}
                    <button className="feeding-start-btn" onClick={handleQuickLog} disabled={saving}>
                        <Check size={14} />
                        {saving ? '...' : 'Vit D'}
                    </button>
                </div>
            </div>
        </div>
    );
}

import { Baby, Droplets, Moon, Heart, Plus, CircleDot, Sun, ShowerHead } from 'lucide-react';
import { useMemo } from 'react';

// Map widget types to PNG icons (null means use Lucide fallback)
const pngIcons = {
    feeding: '/icons/feeding.png',
    diaper: '/icons/diaper.png',
    sleep: '/icons/sleep.png',
    pumping: '/icons/pumping.png',
    potty: null,
    tummy: null,
    bath: null,
};

// Lucide fallback icons
const lucideIcons = {
    feeding: Baby,
    diaper: Droplets,
    sleep: Moon,
    pumping: Heart,
    potty: CircleDot,
    tummy: Sun,
    bath: ShowerHead,
};

// Sketchy color scheme - warm baby-friendly pastels with dark text for readability
const sketchyColors = {
    feeding: { stroke: '#ea580c', bg: '#fff7ed', text: '#9a3412' },   // Orange
    diaper: { stroke: '#059669', bg: '#ecfdf5', text: '#065f46' },    // Emerald
    sleep: { stroke: '#4f46e5', bg: '#eef2ff', text: '#3730a3' },     // Indigo
    pumping: { stroke: '#db2777', bg: '#fdf2f8', text: '#9d174d' },   // Pink
    potty: { stroke: '#7c3aed', bg: '#f5f3ff', text: '#5b21b6' },     // Violet
    tummy: { stroke: '#ca8a04', bg: '#fefce8', text: '#854d0e' },     // Yellow
    bath: { stroke: '#0891b2', bg: '#ecfeff', text: '#155e75' },      // Cyan
};

// Generate a subtle wobbly path for hand-drawn effect
function generateSketchyPath(width, height, seed, roughness = 1.5) {
    const points = 60; // More points = smoother edges
    let path = 'M ';

    const wobble = (base, index) => {
        return base + Math.sin(seed + index * 0.4) * roughness + Math.cos(seed * 1.2 + index * 0.6) * roughness * 0.4;
    };

    // Top edge
    for (let i = 0; i <= points; i++) {
        const x = (i / points) * width;
        const y = wobble(0, i);
        path += `${x},${y} `;
    }

    // Right edge
    for (let i = 0; i <= points; i++) {
        const x = wobble(width, i + points);
        const y = (i / points) * height;
        path += `${x},${y} `;
    }

    // Bottom edge
    for (let i = points; i >= 0; i--) {
        const x = (i / points) * width;
        const y = wobble(height, i + points * 2);
        path += `${x},${y} `;
    }

    // Left edge
    for (let i = points; i >= 0; i--) {
        const x = wobble(0, i + points * 3);
        const y = (i / points) * height;
        path += `${x},${y} `;
    }

    path += 'Z';
    return path;
}

// Format time ago from a date
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

// Icon component that uses PNG if available, otherwise Lucide
function WidgetIcon({ type, size, className, strokeWidth }) {
    const pngSrc = pngIcons[type];
    const LucideIcon = lucideIcons[type] || Baby;

    if (pngSrc) {
        return (
            <img
                src={pngSrc}
                alt={type}
                className={className}
                style={{ width: size, height: size, objectFit: 'contain' }}
            />
        );
    }

    return <LucideIcon size={size} strokeWidth={strokeWidth} />;
}

// Sketchy border SVG component
function SketchyBorder({ width, height, type, seed }) {
    const colors = sketchyColors[type] || sketchyColors.feeding;

    const paths = useMemo(() => ({
        main: generateSketchyPath(width, height, seed),
        second: generateSketchyPath(width, height, seed + 0.1),
        third: generateSketchyPath(width, height, seed - 0.1),
        shadow: generateSketchyPath(width, height, seed + 0.5),
    }), [width, height, seed]);

    return (
        <>
            {/* Shadow */}
            <svg
                className="sketchy-shadow"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
            >
                <path
                    d={paths.shadow}
                    fill={colors.stroke}
                    opacity="0.15"
                />
            </svg>

            {/* Main border */}
            <svg
                className="sketchy-border"
                viewBox={`0 0 ${width} ${height}`}
                preserveAspectRatio="none"
            >
                {/* Background fill */}
                <path
                    d={paths.main}
                    fill={colors.bg}
                />
                {/* Two subtle border lines - cleaner hand-drawn effect */}
                <path
                    d={paths.main}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.5"
                />
                <path
                    d={paths.second}
                    fill="none"
                    stroke={colors.stroke}
                    strokeWidth="1.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity="0.25"
                />
            </svg>
        </>
    );
}

export default function Widget({ type, label, value, detail, isSleeping, onClick, lastTime }) {
    const timeAgo = formatTimeAgo(lastTime);
    const isEmpty = !lastTime && value === 'Never';
    const colors = sketchyColors[type] || sketchyColors.feeding;

    // Use a unique seed based on type for consistent but different wobbles
    const seed = useMemo(() => {
        const typeIndex = Object.keys(sketchyColors).indexOf(type);
        return (typeIndex + 1) * 7.3;
    }, [type]);

    return (
        <div
            className={`widget sketchy ${type} ${isSleeping ? 'sleeping' : ''}`}
            onClick={onClick}
            style={{
                '--widget-stroke': colors.stroke,
                '--widget-bg': colors.bg,
                '--widget-text': colors.text
            }}
        >
            {/* Sketchy border */}
            <SketchyBorder width={200} height={150} type={type} seed={seed} />

            {/* Background glow for sleeping */}
            {isSleeping && <div className="widget-glow" />}

            {/* Large semi-transparent background icon */}
            <div className="widget-bg-icon">
                <WidgetIcon type={type} size={80} strokeWidth={1} />
            </div>

            {/* Plus icon to indicate tappable */}
            <div className="widget-add-icon">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <WidgetIcon type={type} size={24} strokeWidth={2} />
                    <span className="widget-label">{label}</span>
                </div>

                {isEmpty ? (
                    <div className="widget-empty">
                        <span className="widget-empty-text">Tap to log</span>
                    </div>
                ) : (
                    <>
                        {timeAgo && (
                            <div className="widget-time-ago">{timeAgo}</div>
                        )}
                        <div className="widget-value">{value}</div>
                        {detail && <div className="widget-detail">{detail}</div>}
                    </>
                )}
            </div>
        </div>
    );
}

export { formatTimeAgo };

import { Baby, Droplets, Moon, Heart, Plus, CircleDot, Sun, ShowerHead } from 'lucide-react';

// Map widget types to Lucide icons
const iconMap = {
    feeding: Baby,
    diaper: Droplets,
    sleep: Moon,
    pumping: Heart,
    potty: CircleDot,
    tummy: Sun,
    bath: ShowerHead,
};

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

export default function Widget({ type, label, value, detail, isSleeping, onClick, lastTime }) {
    const IconComponent = iconMap[type] || Baby;
    const timeAgo = formatTimeAgo(lastTime);
    const isEmpty = !lastTime && value === 'Never';

    return (
        <div
            className={`widget ${type} ${isSleeping ? 'sleeping' : ''}`}
            onClick={onClick}
        >
            {/* Background glow for sleeping */}
            {isSleeping && <div className="widget-glow" />}

            {/* Large semi-transparent background icon */}
            <div className="widget-bg-icon">
                <IconComponent size={80} strokeWidth={1} />
            </div>

            {/* Plus icon to indicate tappable */}
            <div className="widget-add-icon">
                <Plus size={18} />
            </div>

            <div className="widget-content">
                <div className="widget-icon-row">
                    <IconComponent size={24} strokeWidth={2} />
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

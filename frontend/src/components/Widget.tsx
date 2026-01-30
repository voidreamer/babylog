/* eslint-disable @typescript-eslint/no-explicit-any */
import { Baby, Droplets, Moon, Heart, Plus, CircleDot, Sun, ShowerHead, Pill } from 'lucide-react';
import { formatTimeAgo } from '../utils/formatTime';
import { useTranslation } from 'react-i18next';

// Map widget types to PNG icons (null means use Lucide fallback)
const pngIcons: Record<string, string | null> = {
    feeding: '/icons/feeding.png',
    diaper: '/icons/diaper.png',
    sleep: '/icons/sleep.png',
    pumping: '/icons/pumping.png',
    potty: null,
    tummy: null,
    bath: null,
    supplement: null,
};

// Lucide fallback icons
const lucideIcons: Record<string, any> = {
    feeding: Baby,
    diaper: Droplets,
    sleep: Moon,
    pumping: Heart,
    potty: CircleDot,
    tummy: Sun,
    bath: ShowerHead,
    supplement: Pill,
};


// Icon component that uses PNG if available, otherwise Lucide
interface WidgetIconProps { type: string; size: number; className?: string; strokeWidth?: number; }
function WidgetIcon({ type, size, className, strokeWidth }: WidgetIconProps) {
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

interface WidgetProps { type: string; label: string; value: string; detail?: string; isSleeping?: boolean; onClick: () => void; lastTime?: string; }
export default function Widget({ type, label, value, detail, isSleeping, onClick, lastTime }: WidgetProps) {
    const { t } = useTranslation('dashboard');
    const timeAgo = formatTimeAgo(lastTime ?? null);
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
                        <span className="widget-empty-text">{t('tapToLog')}</span>
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

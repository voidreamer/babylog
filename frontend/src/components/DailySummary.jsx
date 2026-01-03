import { useState } from 'react';
import { Baby, Droplets, Moon, Heart, ChevronDown, ChevronUp, BarChart3 } from 'lucide-react';

export default function DailySummary({ summary }) {
    const [isExpanded, setIsExpanded] = useState(false);

    if (!summary) return null;

    const formatTime = (minutes) => {
        if (!minutes) return '0m';
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
    };

    const stats = [
        {
            icon: Baby,
            value: summary.total_feedings,
            label: 'feedings',
            color: 'var(--feeding)',
            extra: summary.total_ml > 0 ? `${summary.total_ml}ml` : null
        },
        {
            icon: Droplets,
            value: summary.total_diapers,
            label: 'diapers',
            color: 'var(--diaper)',
            extra: `${summary.pee_count}💧 ${summary.poo_count}💩`
        },
        {
            icon: Moon,
            value: formatTime(summary.total_sleep_minutes),
            label: 'sleep',
            color: 'var(--sleep)',
            extra: `${summary.sleep_count} naps`
        },
        ...(summary.pumping_count > 0 ? [{
            icon: Heart,
            value: summary.pumping_count,
            label: 'pumps',
            color: 'var(--pumping)',
            extra: summary.total_pumping_ml > 0 ? `${summary.total_pumping_ml}ml` : null
        }] : [])
    ];

    return (
        <div className="daily-summary">
            <button
                className="daily-summary-header"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="daily-summary-title">
                    <BarChart3 size={18} />
                    <span>Today's Summary</span>
                </div>
                {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>

            {isExpanded && (
                <div className="daily-summary-content">
                    {stats.map((stat, index) => (
                        <div key={index} className="daily-summary-stat">
                            <stat.icon size={24} style={{ color: stat.color }} />
                            <div className="daily-summary-stat-value" style={{ color: stat.color }}>
                                {stat.value}
                            </div>
                            <div className="daily-summary-stat-label">{stat.label}</div>
                            {stat.extra && (
                                <div className="daily-summary-stat-extra">{stat.extra}</div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

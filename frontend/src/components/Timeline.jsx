import { format } from 'date-fns';
import Icon from './Icon';

// Parse time from API (UTC) to local Date object
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

const EVENT_CONFIG = {
    feeding: { label: 'Feeding' },
    diaper: { label: 'Diaper' },
    sleep: { label: 'Sleep' },
    pumping: { label: 'Pumping' },
};

export default function Timeline({ events, onRefresh }) {
    if (!events || events.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon" style={{ fontSize: '2rem', opacity: 0.5 }}>📝</div>
                <p className="empty-state-text">No events logged today</p>
            </div>
        );
    }

    const getEventTitle = (event) => {
        const config = EVENT_CONFIG[event.event_type] || { label: event.event_type };

        switch (event.event_type) {
            case 'feeding':
                return `${config.label} - ${event.details.type}`;
            case 'diaper':
                let diaperLabel = `${config.label} - ${event.details.type}`;
                if (event.details.poo_amount) diaperLabel += ` (${event.details.poo_amount})`;
                return diaperLabel;
            case 'sleep':
                return event.details.end_time
                    ? `${config.label} - ${event.details.duration_minutes || 0}min`
                    : `${config.label} - in progress`;
            case 'pumping':
                return event.details.amount_ml
                    ? `${config.label} - ${event.details.amount_ml}ml`
                    : config.label;
            default:
                return config.label;
        }
    };

    const getEventSubtitle = (event) => {
        switch (event.event_type) {
            case 'feeding':
                const parts = [];
                if (event.details.duration_minutes) parts.push(`${event.details.duration_minutes}min`);
                if (event.details.amount_ml) parts.push(`${event.details.amount_ml}ml`);
                if (event.details.notes) parts.push(event.details.notes);
                return parts.join(' • ') || null;
            case 'diaper':
                const diaperParts = [];
                if (event.details.poo_color) diaperParts.push(event.details.poo_color);
                if (event.details.poo_consistency) diaperParts.push(event.details.poo_consistency);
                if (event.details.notes) diaperParts.push(event.details.notes);
                return diaperParts.join(' • ') || null;
            case 'sleep':
                return event.details.notes || null;
            case 'pumping':
                const pumpParts = [];
                if (event.details.duration_minutes) pumpParts.push(`${event.details.duration_minutes}min`);
                if (event.details.notes) pumpParts.push(event.details.notes);
                return pumpParts.join(' • ') || null;
            default:
                return null;
        }
    };

    return (
        <div className="timeline">
            {events.map((event) => (
                <div key={`${event.event_type}-${event.id}`} className="timeline-item">
                    <div className={`timeline-icon ${event.event_type}`}>
                        <Icon name={event.event_type} size={28} />
                    </div>
                    <div className="timeline-content">
                        <div className="timeline-title">{getEventTitle(event)}</div>
                        {getEventSubtitle(event) && (
                            <div className="timeline-subtitle">{getEventSubtitle(event)}</div>
                        )}
                    </div>
                    <div className="timeline-time">
                        {format(parseUTCTime(event.time), 'h:mm a')}
                    </div>
                </div>
            ))}
        </div>
    );
}

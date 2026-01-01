import { format } from 'date-fns';

const EVENT_CONFIG = {
    feeding: { icon: '🍼', label: 'Feeding' },
    diaper: { icon: '🧷', label: 'Diaper' },
    sleep: { icon: '😴', label: 'Sleep' },
};

export default function Timeline({ events, onRefresh }) {
    if (!events || events.length === 0) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">📝</div>
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
                return `${config.label} - ${event.details.type}`;
            case 'sleep':
                return event.details.end_time
                    ? `${config.label} - ${event.details.duration_minutes || 0}min`
                    : `${config.label} - in progress`;
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
                return event.details.notes || null;
            case 'sleep':
                return event.details.notes || null;
            default:
                return null;
        }
    };

    return (
        <div className="timeline">
            {events.map((event) => {
                const config = EVENT_CONFIG[event.event_type] || { icon: '📌' };

                return (
                    <div key={`${event.event_type}-${event.id}`} className="timeline-item">
                        <div className={`timeline-icon ${event.event_type}`}>
                            {config.icon}
                        </div>
                        <div className="timeline-content">
                            <div className="timeline-title">{getEventTitle(event)}</div>
                            {getEventSubtitle(event) && (
                                <div className="timeline-subtitle">{getEventSubtitle(event)}</div>
                            )}
                        </div>
                        <div className="timeline-time">
                            {format(new Date(event.time), 'h:mm a')}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format, subDays, addDays, startOfDay, differenceInMinutes } from 'date-fns';

// Parse UTC time string to local Date
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

// Event type config
const EVENT_CONFIG = {
    feeding: { icon: '🍼', color: 'var(--feeding)', bg: 'var(--feeding-bg)', label: 'Feeding' },
    diaper: { icon: '🧷', color: 'var(--diaper)', bg: 'var(--diaper-bg)', label: 'Diaper' },
    sleep: { icon: '😴', color: 'var(--sleep)', bg: 'var(--sleep-bg)', label: 'Sleep' },
    pumping: { icon: '🍶', color: 'var(--pumping)', bg: 'var(--pumping-bg)', label: 'Pumping' },
};

export default function TimelineCalendar() {
    const { selectedBaby } = useBaby();
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [swipedEventId, setSwipedEventId] = useState(null);
    const scrollRef = useRef(null);

    const loadEvents = async () => {
        if (!selectedBaby) return;
        setLoading(true);
        try {
            const data = await api.getTimeline(selectedBaby.id, selectedDate.toISOString());
            setEvents(data);
        } catch (error) {
            console.error('Failed to load timeline:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadEvents();
    }, [selectedBaby, selectedDate]);

    // Scroll to current hour on load
    useEffect(() => {
        if (scrollRef.current && !loading) {
            const now = new Date();
            const isToday = startOfDay(selectedDate).getTime() === startOfDay(now).getTime();
            const scrollHour = isToday ? Math.max(0, now.getHours() - 2) : 6;
            const hourHeight = 80; // px per hour
            scrollRef.current.scrollTop = scrollHour * hourHeight;
        }
    }, [loading, selectedDate]);

    const navigateDay = (delta) => {
        setSelectedDate(prev => delta > 0 ? addDays(prev, 1) : subDays(prev, 1));
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    const handleDelete = async (event) => {
        if (!confirm(`Delete this ${event.event_type}?`)) return;

        try {
            switch (event.event_type) {
                case 'feeding':
                    await api.deleteFeeding(event.id);
                    break;
                case 'diaper':
                    await api.deleteDiaper(event.id);
                    break;
                case 'sleep':
                    await api.deleteSleep(event.id);
                    break;
                case 'pumping':
                    await api.deletePumping(event.id);
                    break;
            }
            loadEvents();
        } catch (error) {
            alert('Failed to delete');
        }
        setSwipedEventId(null);
    };

    // Calculate position and height for an event
    const getEventStyle = (event) => {
        const eventTime = parseUTCTime(event.time);
        const dayStart = startOfDay(selectedDate);
        const minutesFromStart = differenceInMinutes(eventTime, dayStart);
        const top = (minutesFromStart / 60) * 80; // 80px per hour

        // Duration events get height based on duration
        let height = 30; // Default for point events like diaper
        if (event.event_type === 'sleep' && event.end_time) {
            const endTime = parseUTCTime(event.end_time);
            const durationMins = differenceInMinutes(endTime, eventTime);
            height = Math.max(30, (durationMins / 60) * 80);
        } else if (event.duration_minutes) {
            height = Math.max(30, (event.duration_minutes / 60) * 80);
        }

        return { top: `${top}px`, height: `${height}px` };
    };

    const formatEventDetail = (event) => {
        switch (event.event_type) {
            case 'feeding':
                return event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : '';
            case 'diaper':
                return event.type ? event.type.charAt(0).toUpperCase() + event.type.slice(1) : '';
            case 'sleep':
                return event.duration_display || '';
            case 'pumping':
                return event.amount_ml ? `${event.amount_ml}ml` : '';
            default:
                return '';
        }
    };

    if (!selectedBaby) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon">👶</div>
                <h2 className="empty-state-title">No baby selected</h2>
            </div>
        );
    }

    // Generate hour markers
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div className="timeline-calendar">
            {/* Date Navigation */}
            <div className="timeline-calendar-header">
                <button className="timeline-nav-btn" onClick={() => navigateDay(-1)}>◀</button>
                <div className="timeline-date" onClick={goToToday}>
                    {format(selectedDate, 'EEE, MMM d, yyyy')}
                </div>
                <button className="timeline-nav-btn" onClick={() => navigateDay(1)}>▶</button>
            </div>

            {loading ? (
                <div className="loading" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <div className="timeline-calendar-scroll" ref={scrollRef}>
                    <div className="timeline-calendar-content">
                        {/* Hour markers */}
                        {hours.map(hour => (
                            <div key={hour} className="timeline-hour-row">
                                <div className="timeline-hour-label">
                                    {format(new Date().setHours(hour, 0), 'h a')}
                                </div>
                                <div className="timeline-hour-line"></div>
                            </div>
                        ))}

                        {/* Events */}
                        <div className="timeline-events-container">
                            {events.map(event => {
                                const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.feeding;
                                const style = getEventStyle(event);
                                const isSwiped = swipedEventId === `${event.event_type}-${event.id}`;

                                return (
                                    <div
                                        key={`${event.event_type}-${event.id}`}
                                        className={`timeline-event-block ${event.event_type} ${isSwiped ? 'swiped' : ''}`}
                                        style={{
                                            ...style,
                                            background: config.bg,
                                            borderLeft: `4px solid ${config.color}`,
                                        }}
                                        onClick={() => {
                                            if (isSwiped) {
                                                setSwipedEventId(null);
                                            } else {
                                                setSwipedEventId(`${event.event_type}-${event.id}`);
                                            }
                                        }}
                                    >
                                        <div className="timeline-event-content">
                                            <span className="timeline-event-icon">{config.icon}</span>
                                            <span className="timeline-event-time">
                                                {format(parseUTCTime(event.time), 'h:mm a')}
                                            </span>
                                            <span className="timeline-event-detail">
                                                {formatEventDetail(event)}
                                            </span>
                                        </div>

                                        {/* Delete button (shown when swiped) */}
                                        {isSwiped && (
                                            <button
                                                className="timeline-event-delete"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDelete(event);
                                                }}
                                            >
                                                🗑️ Delete
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

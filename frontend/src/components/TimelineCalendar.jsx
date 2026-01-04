import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format, subDays, addDays, startOfDay, differenceInMinutes, isToday } from 'date-fns';
import FeedingModal from './FeedingModal';
import DiaperModal from './DiaperModal';
import SleepModal from './SleepModal';
import PumpingModal from './PumpingModal';
import PottyModal from './PottyModal';
import TummyTimeModal from './TummyTimeModal';
import BathModal from './BathModal';
import { Baby, Droplets, Moon, Milk, Pencil, Trash2, CircleDot, Sun, ShowerHead } from 'lucide-react';
import { toast } from 'sonner';

// Parse UTC time string to local Date
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

// Event type config with Lucide icons
const EVENT_CONFIG = {
    feeding: { icon: Baby, color: 'var(--feeding)', bg: 'var(--feeding-bg)', label: 'Feeding' },
    diaper: { icon: Droplets, color: 'var(--diaper)', bg: 'var(--diaper-bg)', label: 'Diaper' },
    sleep: { icon: Moon, color: 'var(--sleep)', bg: 'var(--sleep-bg)', label: 'Sleep' },
    pumping: { icon: Milk, color: 'var(--pumping)', bg: 'var(--pumping-bg)', label: 'Pumping' },
    potty: { icon: CircleDot, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', label: 'Potty' },
    tummy: { icon: Sun, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', label: 'Tummy Time' },
    bath: { icon: ShowerHead, color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)', label: 'Bath' },
};

export default function TimelineCalendar() {
    const { selectedBaby } = useBaby();
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const scrollRef = useRef(null);

    const loadEvents = async () => {
        if (!selectedBaby) return;
        setLoading(true);
        try {
            // Send local date and timezone offset for correct filtering
            const localDate = format(selectedDate, 'yyyy-MM-dd');
            const tzOffset = new Date().getTimezoneOffset(); // Minutes offset from UTC
            const data = await api.getTimeline(selectedBaby.id, localDate, tzOffset);
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

    const handleEdit = (event) => {
        setEditingEvent(event);
        setSelectedEventId(null);
    };

    const handleEditComplete = () => {
        setEditingEvent(null);
        loadEvents();
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
                case 'potty':
                    await api.deletePottyLog(event.id);
                    break;
                case 'tummy':
                    await api.deleteTummyTime(event.id);
                    break;
                case 'bath':
                    await api.deleteBath(event.id);
                    break;
            }
            loadEvents();
        } catch (error) {
            toast.error('Failed to delete');
        }
        setSelectedEventId(null);
    };

    // Calculate event end time in minutes from day start
    const getEventEnd = (event) => {
        const eventTime = parseUTCTime(event.time);
        const dayStart = startOfDay(selectedDate);
        const startMins = differenceInMinutes(eventTime, dayStart);
        const details = event.details || {};

        if (event.event_type === 'sleep' && details.end_time) {
            const endTime = parseUTCTime(details.end_time);
            return differenceInMinutes(endTime, dayStart);
        } else if (details.duration_minutes) {
            return startMins + details.duration_minutes;
        }
        return startMins + 15; // Default 15 min for point events
    };

    // Calculate columns for overlapping events
    const calculateEventColumns = (events) => {
        const sortedEvents = [...events].sort((a, b) => {
            const timeA = parseUTCTime(a.time);
            const timeB = parseUTCTime(b.time);
            return timeA - timeB;
        });

        const eventColumns = new Map();

        sortedEvents.forEach((event, idx) => {
            const eventStart = differenceInMinutes(parseUTCTime(event.time), startOfDay(selectedDate));
            const eventEnd = getEventEnd(event);

            // Find overlapping events that already have columns
            let maxColumn = -1;
            let usedColumns = new Set();

            sortedEvents.slice(0, idx).forEach(prevEvent => {
                const prevStart = differenceInMinutes(parseUTCTime(prevEvent.time), startOfDay(selectedDate));
                const prevEnd = getEventEnd(prevEvent);

                // Check if they overlap
                if (eventStart < prevEnd && eventEnd > prevStart) {
                    const prevCol = eventColumns.get(`${prevEvent.event_type}-${prevEvent.id}`);
                    if (prevCol !== undefined) {
                        usedColumns.add(prevCol.column);
                        maxColumn = Math.max(maxColumn, prevCol.totalColumns - 1);
                    }
                }
            });

            // Find first available column
            let column = 0;
            while (usedColumns.has(column)) {
                column++;
            }

            eventColumns.set(`${event.event_type}-${event.id}`, {
                column,
                totalColumns: Math.max(maxColumn + 1, column + 1)
            });
        });

        // Second pass: update totalColumns for overlapping groups
        sortedEvents.forEach(event => {
            const eventStart = differenceInMinutes(parseUTCTime(event.time), startOfDay(selectedDate));
            const eventEnd = getEventEnd(event);

            let maxCol = eventColumns.get(`${event.event_type}-${event.id}`).column;

            sortedEvents.forEach(otherEvent => {
                const otherStart = differenceInMinutes(parseUTCTime(otherEvent.time), startOfDay(selectedDate));
                const otherEnd = getEventEnd(otherEvent);

                if (eventStart < otherEnd && eventEnd > otherStart) {
                    const otherCol = eventColumns.get(`${otherEvent.event_type}-${otherEvent.id}`);
                    maxCol = Math.max(maxCol, otherCol.column);
                }
            });

            const current = eventColumns.get(`${event.event_type}-${event.id}`);
            eventColumns.set(`${event.event_type}-${event.id}`, {
                ...current,
                totalColumns: maxCol + 1
            });
        });

        return eventColumns;
    };

    const eventColumns = calculateEventColumns(events);

    // Calculate position and height for an event
    const getEventStyle = (event) => {
        const eventTime = parseUTCTime(event.time);
        const dayStart = startOfDay(selectedDate);
        const minutesFromStart = differenceInMinutes(eventTime, dayStart);
        const top = (minutesFromStart / 60) * 80; // 80px per hour
        const details = event.details || {};

        // Duration events get height based on duration
        let height = 30; // Default for point events like diaper
        if (event.event_type === 'sleep' && details.end_time) {
            const endTime = parseUTCTime(details.end_time);
            const durationMins = differenceInMinutes(endTime, eventTime);
            height = Math.max(30, (durationMins / 60) * 80);
        } else if (details.duration_minutes) {
            height = Math.max(30, (details.duration_minutes / 60) * 80);
        }

        // Calculate width and left position for overlapping events
        const colInfo = eventColumns.get(`${event.event_type}-${event.id}`) || { column: 0, totalColumns: 1 };
        const widthPercent = 100 / colInfo.totalColumns;
        const leftPercent = colInfo.column * widthPercent;

        return {
            top: `${top}px`,
            height: `${height}px`,
            width: `${widthPercent}%`,
            left: `${leftPercent}%`
        };
    };

    const formatEventDetail = (event) => {
        const details = event.details || {};
        switch (event.event_type) {
            case 'feeding':
                let feedType = details.type || '';
                // Format the type for display
                if (feedType === 'breastmilk_bottle') {
                    feedType = 'Breastmilk Bottle';
                } else if (feedType === 'bottle') {
                    // Legacy data - treat as breastmilk bottle
                    feedType = 'Breastmilk Bottle';
                } else {
                    feedType = feedType.charAt(0).toUpperCase() + feedType.slice(1);
                }
                const duration = details.duration_minutes ? ` • ${details.duration_minutes}min` : '';
                return feedType + duration;
            case 'diaper':
                return details.type ? details.type.charAt(0).toUpperCase() + details.type.slice(1) : '';
            case 'sleep':
                if (details.duration_minutes) {
                    const hrs = Math.floor(details.duration_minutes / 60);
                    const mins = details.duration_minutes % 60;
                    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                }
                return details.end_time ? '' : 'Sleeping...';
            case 'pumping':
                return details.amount_ml ? `${details.amount_ml}ml` : '';
            case 'potty':
                const result = details.result ? details.result.charAt(0).toUpperCase() + details.result.slice(1) : '';
                return result || 'Potty';
            case 'tummy':
                return details.duration_minutes ? `${details.duration_minutes}min` : 'Tummy Time';
            case 'bath':
                return details.notes || 'Bath';
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
                            {/* Current Time Indicator - only show for today */}
                            {isToday(selectedDate) && (() => {
                                const now = new Date();
                                const dayStart = startOfDay(selectedDate);
                                const currentMinutes = differenceInMinutes(now, dayStart);
                                const topPosition = (currentMinutes / (24 * 60)) * 100;

                                return (
                                    <div
                                        className="timeline-current-time"
                                        style={{ top: `${topPosition}%` }}
                                    >
                                        <span className="timeline-current-time-label">
                                            {format(now, 'h:mm a')}
                                        </span>
                                    </div>
                                );
                            })()}

                            {events.map(event => {
                                const config = EVENT_CONFIG[event.event_type] || EVENT_CONFIG.feeding;
                                const style = getEventStyle(event);
                                const isSelected = selectedEventId === `${event.event_type}-${event.id}`;

                                return (
                                    <div
                                        key={`${event.event_type}-${event.id}`}
                                        className={`timeline-event-block ${event.event_type} ${isSelected ? 'selected' : ''}`}
                                        style={{
                                            ...style,
                                            background: config.bg,
                                            borderLeft: `4px solid ${config.color}`,
                                        }}
                                        onClick={() => {
                                            if (isSelected) {
                                                setSelectedEventId(null);
                                            } else {
                                                setSelectedEventId(`${event.event_type}-${event.id}`);
                                            }
                                        }}
                                    >
                                        <div className="timeline-event-content">
                                            <span className="timeline-event-icon"><config.icon size={14} /></span>
                                            <span className="timeline-event-time">
                                                {format(parseUTCTime(event.time), 'h:mm a')}
                                            </span>
                                            <span className="timeline-event-detail">
                                                {formatEventDetail(event)}
                                            </span>
                                        </div>

                                        {/* Action buttons (shown when selected) */}
                                        {isSelected && (
                                            <div className="timeline-event-actions">
                                                <button
                                                    className="timeline-action-btn edit"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleEdit(event);
                                                    }}
                                                >
                                                    <Pencil size={14} /> Edit
                                                </button>
                                                <button
                                                    className="timeline-action-btn delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDelete(event);
                                                    }}
                                                >
                                                    <Trash2 size={14} /> Delete
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modals */}
            {editingEvent?.event_type === 'feeding' && (
                <FeedingModal
                    babyId={selectedBaby.id}
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}

            {editingEvent?.event_type === 'diaper' && (
                <DiaperModal
                    babyId={selectedBaby.id}
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}

            {editingEvent?.event_type === 'sleep' && (
                <SleepModal
                    babyId={selectedBaby.id}
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}

            {editingEvent?.event_type === 'pumping' && (
                <PumpingModal
                    babyId={selectedBaby.id}
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}

            {editingEvent?.event_type === 'potty' && (
                <PottyModal
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}

            {editingEvent?.event_type === 'tummy' && (
                <TummyTimeModal
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}

            {editingEvent?.event_type === 'bath' && (
                <BathModal
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}
        </div>
    );
}

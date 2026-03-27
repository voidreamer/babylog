/* eslint-disable @typescript-eslint/no-explicit-any */
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
import SupplementModal from './SupplementModal';
import SolidModal from './SolidModal';
import { Baby, Droplets, Moon, Milk, Pencil, Trash2, CircleDot, Sun, ShowerHead, Pill, Calendar, X, UtensilsCrossed, ThumbsUp, Minus, ThumbsDown, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import ConfirmModal from './ConfirmModal';


const REACTION_LABELS: Record<string, string> = {
    liked: 'Liked',
    neutral: 'Neutral',
    disliked: 'Disliked',
    allergic: 'Allergic',
};

// Parse UTC time string to local Date
const parseUTCTime = (timeStr: any): Date => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

export default function TimelineCalendar() {
    const { t } = useTranslation('dashboard');

    // Event type config with Lucide icons
    const EVENT_CONFIG: Record<string, any> = {
        feeding: { icon: Baby, color: 'var(--feeding)', bg: 'var(--feeding-bg)', label: t('feeding.title') },
        diaper: { icon: Droplets, color: 'var(--diaper)', bg: 'var(--diaper-bg)', label: t('diaper.title') },
        sleep: { icon: Moon, color: 'var(--sleep)', bg: 'var(--sleep-bg)', label: t('sleep.title') },
        pumping: { icon: Milk, color: 'var(--pumping)', bg: 'var(--pumping-bg)', label: t('pumping.title') },
        potty: { icon: CircleDot, color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)', label: t('potty.title') },
        tummy: { icon: Sun, color: '#fbbf24', bg: 'rgba(251, 191, 36, 0.15)', label: t('tummyTime.title') },
        bath: { icon: ShowerHead, color: '#22d3ee', bg: 'rgba(34, 211, 238, 0.15)', label: t('bath.title') },
        supplement: { icon: Pill, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)', label: t('supplement.title') },
        solid: { icon: UtensilsCrossed, color: 'var(--solid)', bg: 'var(--solid-bg)', label: t('solid.title', { defaultValue: 'Solids' }) },
    };
    const { selectedBaby } = useBaby();
    const [events, setEvents] = useState<any[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
    const [editingEvent, setEditingEvent] = useState<any>(null);
    const [confirmDelete, setConfirmDelete] = useState<any>(null); // Event to delete
    const scrollRef = useRef<HTMLDivElement>(null);

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
            const isTodaySelected = isToday(selectedDate);
            const scrollHour = isTodaySelected ? Math.max(0, now.getHours() - 2) : 6;
            const hourHeight = 80; // px per hour
            scrollRef.current.scrollTop = scrollHour * hourHeight;
        }
    }, [loading, selectedDate]);

    const navigateDay = (delta: number) => {
        setSelectedDate(prev => delta > 0 ? addDays(prev, 1) : subDays(prev, 1));
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    const handleEdit = (event: any) => {
        setEditingEvent(event);
        setSelectedEventId(null);
    };

    const handleEditComplete = () => {
        setEditingEvent(null);
        loadEvents();
    };

    // Show confirm dialog instead of browser confirm
    const handleDeleteClick = (event: any) => {
        setConfirmDelete(event);
        setSelectedEventId(null);
    };

    const handleDeleteConfirm = async () => {
        if (!confirmDelete) return;
        const event = confirmDelete;

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
                case 'supplement':
                    await api.deleteSupplement(event.id);
                    break;
                case 'solid':
                    await api.deleteSolid(event.id);
                    break;
            }
            toast.success(t('toast_deletedSuccessfully'));
            loadEvents();
        } catch (error) {
            toast.error(t('toast_failedToDelete'));
        }
        setConfirmDelete(null);
    };

    // Calculate event end time in minutes from day start
    const getEventEnd = (event: any): number => {
        const eventTime = parseUTCTime(event.time);
        const dayStart = startOfDay(selectedDate);
        const dayEnd = differenceInMinutes(addDays(dayStart, 1), dayStart); // 1440 minutes (24 hours)
        const startMins = differenceInMinutes(eventTime, dayStart);
        const details = event.details || {};

        if (event.event_type === 'sleep' && details.end_time) {
            const endTime = parseUTCTime(details.end_time);
            const endMins = differenceInMinutes(endTime, dayStart);
            // Clip to day boundaries: if end is beyond this day, cap at midnight
            return Math.min(endMins, dayEnd);
        } else if (details.duration_minutes) {
            return startMins + details.duration_minutes;
        }
        return startMins + 15; // Default 15 min for point events
    };

    // Calculate columns for overlapping events
    const calculateEventColumns = (events: any[]) => {
        const sortedEvents = [...events].sort((a: any, b: any) => {
            const timeA = parseUTCTime(a.time);
            const timeB = parseUTCTime(b.time);
            return timeA.getTime() - timeB.getTime();
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
    const getEventStyle = (event: any) => {
        const eventTime = parseUTCTime(event.time);
        const dayStart = startOfDay(selectedDate);
        const dayEnd = addDays(dayStart, 1);
        const minutesFromStart = differenceInMinutes(eventTime, dayStart);

        // Clip start position: if event starts before this day, start at 0
        const clippedStart = Math.max(0, minutesFromStart);
        const top = (clippedStart / 60) * 80; // 80px per hour

        const details = event.details || {};

        // Duration events get height based on duration
        let height = 30; // Default for point events like diaper
        if (event.event_type === 'sleep' && details.end_time) {
            const endTime = parseUTCTime(details.end_time);
            const eventEndMins = differenceInMinutes(endTime, dayStart);

            // Clip the end time to the current day's end (midnight)
            const clippedEnd = Math.min(eventEndMins, differenceInMinutes(dayEnd, dayStart));

            // Calculate visible duration within this day
            const visibleDurationMins = clippedEnd - clippedStart;
            height = Math.max(30, (visibleDurationMins / 60) * 80);
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

    const formatEventDetail = (event: any): string => {
        const details = event.details || {};
        switch (event.event_type) {
            case 'feeding':
                let feedType = details.type || '';
                // Format the type for display
                const feedTypeMap: Record<string, string> = {
                    breast: t('feeding.breast'),
                    bottle: t('timeline.breastmilkBottle'),
                    breastmilk_bottle: t('timeline.breastmilkBottle'),
                    formula: t('feeding.formula'),
                    solid: t('feeding.solid'),
                };
                feedType = feedTypeMap[feedType] || feedType;
                const duration = details.duration_minutes ? ` • ${details.duration_minutes}min` : '';
                return feedType + duration;
            case 'diaper':
                const diaperType = details.type || '';
                const diaperLabel = ({ pee: t('diaper.pee'), poo: t('diaper.poo'), mixed: t('diaper.both') } as Record<string, string>)[diaperType] || diaperType;
                return diaperLabel;
            case 'sleep':
                if (details.duration_minutes) {
                    const hrs = Math.floor(details.duration_minutes / 60);
                    const mins = details.duration_minutes % 60;
                    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                }
                return details.end_time ? '' : t('timeline.sleeping');
            case 'pumping':
                const pumpParts = [];
                if (details.duration_minutes) pumpParts.push(`${details.duration_minutes}min`);
                if (details.amount_ml) pumpParts.push(`${details.amount_ml}ml`);
                return pumpParts.join(' • ') || t('pumping.title');
            case 'potty':
                const resultLabel = ({ success: t('potty.success'), attempt: t('timeline.attempt') } as Record<string, string>)[details.result] || details.result || '';
                return resultLabel;
            case 'tummy':
                return details.duration_minutes ? `${t('tummyTime.title')} • ${details.duration_minutes}min` : t('tummyTime.title');
            case 'bath':
                return details.notes ? `${t('bath.title')} • ${details.notes}` : t('bath.title');
            case 'supplement':
                const supName = details.name ? details.name.replace('_', ' ') : t('supplement.title');
                const supNameFormatted = supName.split(' ').map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return details.dosage ? `${supNameFormatted} • ${details.dosage}` : supNameFormatted;
            case 'solid':
                const solidParts = [];
                if (details.food_name) solidParts.push(details.food_name);
                if (details.amount) solidParts.push(details.amount);
                if (details.reaction) solidParts.push(REACTION_LABELS[details.reaction] || details.reaction);
                return solidParts.join(' • ') || t('solid.title', { defaultValue: 'Solids' });
            default:
                return '';
        }
    };

    if (!selectedBaby) {
        return (
            <div className="empty-state">
                <div className="empty-state-icon"><Baby size={32} /></div>
                <h2 className="empty-state-title">{t('common:noBabySelected')}</h2>
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
                <div
                    className="timeline-calendar-scroll"
                    ref={scrollRef}
                    onClick={(e) => {
                        // Deselect when clicking outside event blocks
                        if (!(e.target as HTMLElement).closest('.timeline-event-block')) {
                            setSelectedEventId(null);
                        }
                    }}
                >
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
                                            cursor: 'pointer',
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
                                                    <Pencil size={14} /> {t('timeline.edit')}
                                                </button>
                                                <button
                                                    className="timeline-action-btn delete"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteClick(event);
                                                    }}
                                                >
                                                    <Trash2 size={14} /> {t('timeline.delete')}
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}

                            {/* Empty state when no events */}
                            {events.length === 0 && (
                                <div className="timeline-empty-state">
                                    <Calendar size={48} strokeWidth={1.5} />
                                    <p>{t('timeline.noEventsRecorded')}</p>
                                    <span>{t('timeline.addFromDashboard')}</span>
                                </div>
                            )}
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

            {editingEvent?.event_type === 'supplement' && (
                <SupplementModal
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}

            {editingEvent?.event_type === 'solid' && (
                <SolidModal
                    editEvent={editingEvent}
                    onClose={() => setEditingEvent(null)}
                    onSave={handleEditComplete}
                />
            )}

            {/* Custom Confirm Delete Modal */}
            <ConfirmModal
                open={!!confirmDelete}
                title={confirmDelete ? t('timeline.deleteConfirmTitle', { type: EVENT_CONFIG[confirmDelete.event_type]?.label || 'Event' }) : ''}
                message={t('timeline.deleteConfirmMessage')}
                onConfirm={handleDeleteConfirm}
                onCancel={() => setConfirmDelete(null)}
            />
        </div>
    );
}

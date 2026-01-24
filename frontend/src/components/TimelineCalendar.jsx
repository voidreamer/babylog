import { useState, useEffect, useRef, useCallback } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { format, subDays, addDays, startOfDay, differenceInMinutes, isToday, addMinutes } from 'date-fns';
import FeedingModal from './FeedingModal';
import DiaperModal from './DiaperModal';
import SleepModal from './SleepModal';
import PumpingModal from './PumpingModal';
import PottyModal from './PottyModal';
import TummyTimeModal from './TummyTimeModal';
import BathModal from './BathModal';
import SupplementModal from './SupplementModal';
import { Baby, Droplets, Moon, Milk, Pencil, Trash2, CircleDot, Sun, ShowerHead, Pill, Calendar, X, Undo2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

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
    supplement: { icon: Pill, color: '#16a34a', bg: 'rgba(22, 163, 74, 0.15)', label: 'Supplement' },
};

export default function TimelineCalendar() {
    const { selectedBaby } = useBaby();
    const [events, setEvents] = useState([]);
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [loading, setLoading] = useState(true);
    const [selectedEventId, setSelectedEventId] = useState(null);
    const [editingEvent, setEditingEvent] = useState(null);
    const [confirmDelete, setConfirmDelete] = useState(null); // Event to delete
    const scrollRef = useRef(null);

    // Drag and drop state
    const [draggedEvent, setDraggedEvent] = useState(null);
    const [dragOffset, setDragOffset] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const dragStartY = useRef(null);
    const dragStartScrollTop = useRef(null);

    // Undo state - stores the last moved event's original state
    const [undoAction, setUndoAction] = useState(null);

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

    const navigateDay = (delta) => {
        setSelectedDate(prev => delta > 0 ? addDays(prev, 1) : subDays(prev, 1));
    };

    const goToToday = () => {
        setSelectedDate(new Date());
    };

    // Drag and drop handlers
    const handleDragStart = useCallback((e, event) => {
        e.stopPropagation();
        // Don't start drag if clicking on action buttons
        if (e.target.closest('.timeline-action-btn')) return;

        const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;
        dragStartY.current = clientY;
        dragStartScrollTop.current = scrollRef.current?.scrollTop || 0;

        setDraggedEvent(event);
        setDragOffset(0);
        setIsDragging(true);
        setSelectedEventId(null); // Deselect when starting drag
    }, []);

    const handleDragMove = useCallback((e) => {
        if (!isDragging || !draggedEvent) return;

        const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;
        const deltaY = clientY - dragStartY.current;

        // Account for scroll changes during drag
        const scrollDelta = (scrollRef.current?.scrollTop || 0) - dragStartScrollTop.current;
        const totalDelta = deltaY + scrollDelta;

        setDragOffset(totalDelta);
    }, [isDragging, draggedEvent]);

    const handleDragEnd = useCallback(async () => {
        if (!isDragging || !draggedEvent || Math.abs(dragOffset) < 10) {
            // Minimal movement - treat as a click, not a drag
            setIsDragging(false);
            setDraggedEvent(null);
            setDragOffset(0);
            return;
        }

        // Calculate new time based on drag offset
        // 80px = 1 hour, so offset in minutes = (offset / 80) * 60
        const minutesOffset = Math.round((dragOffset / 80) * 60);

        // Round to nearest 5 minutes for cleaner times
        const roundedMinutes = Math.round(minutesOffset / 5) * 5;

        if (roundedMinutes === 0) {
            setIsDragging(false);
            setDraggedEvent(null);
            setDragOffset(0);
            return;
        }

        const originalTime = parseUTCTime(draggedEvent.time);
        const newTime = addMinutes(originalTime, roundedMinutes);

        // Store undo action before updating
        const previousState = {
            event: draggedEvent,
            originalTime: draggedEvent.time,
        };

        try {
            // Update the event time via API
            await updateEventTime(draggedEvent, newTime);

            // Save undo action
            setUndoAction(previousState);

            toast.success(`Moved to ${format(newTime, 'h:mm a')}`);
            loadEvents();
        } catch (error) {
            toast.error('Failed to update time');
        }

        setIsDragging(false);
        setDraggedEvent(null);
        setDragOffset(0);
    }, [isDragging, draggedEvent, dragOffset, selectedDate]);

    // Update event time via API
    const updateEventTime = async (event, newTime) => {
        const details = event.details || {};
        const newTimeISO = newTime.toISOString();

        switch (event.event_type) {
            case 'feeding':
                await api.updateFeeding(event.id, {
                    baby_id: selectedBaby.id,
                    time: newTimeISO,
                    type: details.type,
                    duration_minutes: details.duration_minutes,
                    amount_ml: details.amount_ml,
                    notes: details.notes,
                });
                break;
            case 'diaper':
                await api.updateDiaper(event.id, {
                    baby_id: selectedBaby.id,
                    time: newTimeISO,
                    type: details.type,
                    poo_color: details.poo_color,
                    poo_consistency: details.poo_consistency,
                    poo_amount: details.poo_amount,
                    notes: details.notes,
                });
                break;
            case 'sleep':
                // For sleep, we need to adjust both start and end times
                const oldStart = parseUTCTime(event.time);
                const oldEnd = details.end_time ? parseUTCTime(details.end_time) : null;
                const timeDiff = newTime.getTime() - oldStart.getTime();

                await api.updateSleep(event.id, {
                    baby_id: selectedBaby.id,
                    start_time: newTimeISO,
                    end_time: oldEnd ? new Date(oldEnd.getTime() + timeDiff).toISOString() : null,
                    notes: details.notes,
                });
                break;
            case 'pumping':
                await api.updatePumping(event.id, {
                    baby_id: selectedBaby.id,
                    time: newTimeISO,
                    duration_minutes: details.duration_minutes,
                    amount_ml: details.amount_ml,
                    notes: details.notes,
                });
                break;
            case 'potty':
                await api.updatePottyLog(event.id, {
                    baby_id: selectedBaby.id,
                    time: newTimeISO,
                    result: details.result,
                    potty_type: details.potty_type,
                    notes: details.notes,
                });
                break;
            case 'tummy':
                await api.updateTummyTime(event.id, {
                    baby_id: selectedBaby.id,
                    start_time: newTimeISO,
                    duration_minutes: details.duration_minutes,
                    notes: details.notes,
                });
                break;
            case 'bath':
                await api.updateBath(event.id, {
                    baby_id: selectedBaby.id,
                    time: newTimeISO,
                    notes: details.notes,
                });
                break;
            case 'supplement':
                await api.updateSupplement(event.id, {
                    baby_id: selectedBaby.id,
                    time: newTimeISO,
                    name: details.name,
                    dosage: details.dosage,
                    notes: details.notes,
                });
                break;
        }
    };

    // Handle undo
    const handleUndo = async () => {
        if (!undoAction) return;

        try {
            const originalTime = parseUTCTime(undoAction.originalTime);
            await updateEventTime(undoAction.event, originalTime);
            toast.success('Undone');
            setUndoAction(null);
            loadEvents();
        } catch (error) {
            toast.error('Failed to undo');
        }
    };

    // Add global mouse/touch move and end handlers
    useEffect(() => {
        if (!isDragging) return;

        const handleMove = (e) => handleDragMove(e);
        const handleEnd = () => handleDragEnd();

        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
        document.addEventListener('touchmove', handleMove, { passive: false });
        document.addEventListener('touchend', handleEnd);

        return () => {
            document.removeEventListener('mousemove', handleMove);
            document.removeEventListener('mouseup', handleEnd);
            document.removeEventListener('touchmove', handleMove);
            document.removeEventListener('touchend', handleEnd);
        };
    }, [isDragging, handleDragMove, handleDragEnd]);

    const handleEdit = (event) => {
        setEditingEvent(event);
        setSelectedEventId(null);
    };

    const handleEditComplete = () => {
        setEditingEvent(null);
        loadEvents();
    };

    // Show confirm dialog instead of browser confirm
    const handleDeleteClick = (event) => {
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
            }
            toast.success('Deleted successfully');
            loadEvents();
        } catch (error) {
            toast.error('Failed to delete');
        }
        setConfirmDelete(null);
    };

    // Calculate event end time in minutes from day start
    const getEventEnd = (event) => {
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
                const diaperType = details.type || '';
                const diaperLabel = { pee: 'Pee', poo: 'Poo', mixed: 'Both' }[diaperType] || diaperType;
                return diaperLabel;
            case 'sleep':
                if (details.duration_minutes) {
                    const hrs = Math.floor(details.duration_minutes / 60);
                    const mins = details.duration_minutes % 60;
                    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
                }
                return details.end_time ? '' : 'Sleeping...';
            case 'pumping':
                const pumpParts = [];
                if (details.duration_minutes) pumpParts.push(`${details.duration_minutes}min`);
                if (details.amount_ml) pumpParts.push(`${details.amount_ml}ml`);
                return pumpParts.join(' • ') || 'Pumping';
            case 'potty':
                const resultLabel = { success: 'Success', attempt: 'Attempt' }[details.result] || details.result || '';
                return resultLabel;
            case 'tummy':
                return details.duration_minutes ? `Tummy Time • ${details.duration_minutes}min` : 'Tummy Time';
            case 'bath':
                return details.notes ? `Bath • ${details.notes}` : 'Bath';
            case 'supplement':
                const supName = details.name ? details.name.replace('_', ' ') : 'Supplement';
                const supNameFormatted = supName.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                return details.dosage ? `${supNameFormatted} • ${details.dosage}` : supNameFormatted;
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

            {/* Undo Button - shown when there's an action to undo */}
            <AnimatePresence>
                {undoAction && (
                    <motion.button
                        className="timeline-undo-btn"
                        onClick={handleUndo}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        <Undo2 size={16} />
                        Undo move
                    </motion.button>
                )}
            </AnimatePresence>

            {loading ? (
                <div className="loading" style={{ padding: 'var(--space-2xl)' }}>
                    <div className="spinner"></div>
                </div>
            ) : (
                <div
                    className="timeline-calendar-scroll"
                    ref={scrollRef}
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
                                const isBeingDragged = draggedEvent?.id === event.id && draggedEvent?.event_type === event.event_type;

                                // Calculate dragged position
                                const dragStyle = isBeingDragged ? {
                                    transform: `translateY(${dragOffset}px)`,
                                    zIndex: 100,
                                    opacity: 0.9,
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                                } : {};

                                return (
                                    <div
                                        key={`${event.event_type}-${event.id}`}
                                        className={`timeline-event-block ${event.event_type} ${isSelected ? 'selected' : ''} ${isBeingDragged ? 'dragging' : ''}`}
                                        style={{
                                            ...style,
                                            ...dragStyle,
                                            background: config.bg,
                                            borderLeft: `4px solid ${config.color}`,
                                            cursor: isDragging ? 'grabbing' : 'grab',
                                        }}
                                        onClick={() => {
                                            if (isDragging) return;
                                            if (isSelected) {
                                                setSelectedEventId(null);
                                            } else {
                                                setSelectedEventId(`${event.event_type}-${event.id}`);
                                            }
                                        }}
                                        onMouseDown={(e) => handleDragStart(e, event)}
                                        onTouchStart={(e) => handleDragStart(e, event)}
                                    >
                                        <div className="timeline-event-content">
                                            <span className="timeline-event-drag-handle">
                                                <GripVertical size={12} />
                                            </span>
                                            <span className="timeline-event-icon"><config.icon size={14} /></span>
                                            <span className="timeline-event-time">
                                                {format(parseUTCTime(event.time), 'h:mm a')}
                                            </span>
                                            <span className="timeline-event-detail">
                                                {formatEventDetail(event)}
                                            </span>
                                        </div>

                                        {/* Action buttons (shown when selected) */}
                                        {isSelected && !isDragging && (
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
                                                        handleDeleteClick(event);
                                                    }}
                                                >
                                                    <Trash2 size={14} /> Delete
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
                                    <p>No events recorded</p>
                                    <span>Add activities from the dashboard to see them here</span>
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

            {/* Custom Confirm Delete Modal */}
            <AnimatePresence>
                {confirmDelete && (
                    <motion.div
                        className="modal-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setConfirmDelete(null)}
                    >
                        <motion.div
                            className="confirm-modal"
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button className="modal-close" onClick={() => setConfirmDelete(null)}>
                                <X size={20} />
                            </button>
                            <div className="confirm-modal-content">
                                <Trash2 size={32} className="confirm-icon" />
                                <h3>Delete {EVENT_CONFIG[confirmDelete.event_type]?.label || 'Event'}?</h3>
                                <p>This action cannot be undone.</p>
                                <div className="confirm-modal-actions">
                                    <button
                                        className="btn btn-secondary"
                                        onClick={() => setConfirmDelete(null)}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        className="btn btn-danger"
                                        onClick={handleDeleteConfirm}
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

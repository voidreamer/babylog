import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { formatDistanceToNow } from 'date-fns';
import { Moon, Sun } from 'lucide-react';
import { toast } from 'sonner';
import TimePicker from './TimePicker';

// Parse time from API (UTC) to local Date object
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

export default function SleepModal({ babyId, currentSleep, editEvent, onClose, onSave }) {
    const isEditing = !!editEvent;
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date()); // Initialize to now instead of null
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setStartTime(parseUTCTime(editEvent.time));
            if (details.end_time) {
                setEndTime(parseUTCTime(details.end_time));
            }
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    const handleStartSleep = async () => {
        setSaving(true);
        try {
            await api.createSleep({
                baby_id: babyId,
                start_time: startTime.toISOString(),
                end_time: null,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            console.error('Failed to start sleep:', error);
            toast.error('Failed to start sleep');
        } finally {
            setSaving(false);
        }
    };

    const handleEndSleep = async () => {
        if (!currentSleep) return;
        setSaving(true);
        try {
            await api.endSleep(currentSleep.id);
            onSave();
        } catch (error) {
            console.error('Failed to end sleep:', error);
            toast.error('Failed to end sleep');
        } finally {
            setSaving(false);
        }
    };

    const handleLogCompletedSleep = async (e) => {
        e.preventDefault();
        if (!endTime) {
            toast.error('Please enter an end time');
            return;
        }
        setSaving(true);

        const data = {
            baby_id: babyId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            notes: notes || null,
        };

        try {
            if (isEditing) {
                await api.updateSleep(editEvent.id, data);
            } else {
                await api.createSleep(data);
            }
            onSave();
        } catch (error) {
            console.error('Failed to log sleep:', error);
            toast.error('Failed to log sleep');
        } finally {
            setSaving(false);
        }
    };

    // If baby is currently sleeping and not editing, show wake up option
    if (currentSleep && !isEditing) {
        const sleepingFor = formatDistanceToNow(parseUTCTime(currentSleep.start_time));

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="modal-title"><Moon size={20} style={{ marginRight: '8px' }} /> Baby is Sleeping</h2>
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>

                    <div className="modal-body">
                        <div className="empty-state">
                            <div className="empty-state-icon">💤</div>
                            <h3 className="empty-state-title">Sleeping for {sleepingFor}</h3>
                            <p className="empty-state-text">
                                Started at {parseUTCTime(currentSleep.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </p>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Keep Sleeping
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleEndSleep}
                            disabled={saving}
                        >
                            {saving ? 'Waking...' : <><Sun size={16} /> Wake Up</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Moon size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Sleep</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Quick Start Sleep - only show when not editing */}
                    {!isEditing && (
                        <>
                            <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                                <h4 style={{ marginBottom: 'var(--space-md)' }}>Start Sleeping Now</h4>
                                <button
                                    type="button"
                                    className="btn btn-primary btn-block btn-lg"
                                    onClick={handleStartSleep}
                                    disabled={saving}
                                >
                                    {saving ? 'Starting...' : <><Moon size={16} /> Baby is Falling Asleep</>}
                                </button>
                            </div>

                            <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                                — or log a completed sleep —
                            </div>
                        </>
                    )}

                    {/* Log Completed Sleep */}
                    <form onSubmit={handleLogCompletedSleep}>
                        <div className="form-group">
                            <label className="form-label">Start Time</label>
                            <TimePicker value={startTime} onChange={setStartTime} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">End Time</label>
                            <TimePicker value={endTime} onChange={setEndTime} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Optional notes..."
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                            />
                        </div>

                        <div className="modal-footer" style={{ padding: 0, borderTop: 'none' }}>
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Cancel
                            </button>
                            <button type="submit" className="btn btn-primary" disabled={saving}>
                                {saving ? 'Saving...' : (isEditing ? 'Save Changes' : 'Log Completed Sleep')}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

import { useState } from 'react';
import { api } from '../api/client';
import { formatDistanceToNow } from 'date-fns';

export default function SleepModal({ babyId, currentSleep, onClose, onSave }) {
    const [startTime, setStartTime] = useState(new Date().toISOString().slice(0, 16));
    const [endTime, setEndTime] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleStartSleep = async () => {
        setSaving(true);
        try {
            await api.createSleep({
                baby_id: babyId,
                start_time: new Date(startTime).toISOString(),
                end_time: null,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            console.error('Failed to start sleep:', error);
            alert('Failed to start sleep');
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
            alert('Failed to end sleep');
        } finally {
            setSaving(false);
        }
    };

    const handleLogCompletedSleep = async (e) => {
        e.preventDefault();
        if (!endTime) {
            alert('Please enter an end time');
            return;
        }
        setSaving(true);
        try {
            await api.createSleep({
                baby_id: babyId,
                start_time: new Date(startTime).toISOString(),
                end_time: new Date(endTime).toISOString(),
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            console.error('Failed to log sleep:', error);
            alert('Failed to log sleep');
        } finally {
            setSaving(false);
        }
    };

    // If baby is currently sleeping, show wake up option
    if (currentSleep) {
        const sleepingFor = formatDistanceToNow(new Date(currentSleep.start_time));

        return (
            <div className="modal-overlay" onClick={onClose}>
                <div className="modal" onClick={(e) => e.stopPropagation()}>
                    <div className="modal-header">
                        <h2 className="modal-title">😴 Baby is Sleeping</h2>
                        <button className="modal-close" onClick={onClose}>×</button>
                    </div>

                    <div className="modal-body">
                        <div className="empty-state">
                            <div className="empty-state-icon">💤</div>
                            <h3 className="empty-state-title">Sleeping for {sleepingFor}</h3>
                            <p className="empty-state-text">
                                Started at {new Date(currentSleep.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                            {saving ? 'Waking...' : '☀️ Wake Up'}
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
                    <h2 className="modal-title">😴 Log Sleep</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Quick Start Sleep */}
                    <div className="card" style={{ marginBottom: 'var(--space-lg)' }}>
                        <h4 style={{ marginBottom: 'var(--space-md)' }}>Start Sleeping Now</h4>
                        <button
                            type="button"
                            className="btn btn-primary btn-block btn-lg"
                            onClick={handleStartSleep}
                            disabled={saving}
                        >
                            {saving ? 'Starting...' : '🌙 Baby is Falling Asleep'}
                        </button>
                    </div>

                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 'var(--space-lg)' }}>
                        — or log a completed sleep —
                    </div>

                    {/* Log Completed Sleep */}
                    <form onSubmit={handleLogCompletedSleep}>
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Start Time</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={startTime}
                                    onChange={(e) => setStartTime(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label className="form-label">End Time</label>
                                <input
                                    type="datetime-local"
                                    className="form-input"
                                    value={endTime}
                                    onChange={(e) => setEndTime(e.target.value)}
                                />
                            </div>
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

                        <button type="submit" className="btn btn-secondary btn-block" disabled={saving}>
                            {saving ? 'Saving...' : 'Log Completed Sleep'}
                        </button>
                    </form>
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary btn-block" onClick={onClose}>
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}

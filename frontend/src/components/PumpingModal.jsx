import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import TimePicker from './TimePicker';
import { Milk, Pencil, Timer } from 'lucide-react';
import { toast } from 'sonner';

// Helper to parse UTC time
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

export default function PumpingModal({ babyId, editEvent, onClose, onSave }) {
    const isEditing = !!editEvent;
    const [mode, setMode] = useState('quick'); // 'quick' or 'timer'
    const [time, setTime] = useState(new Date());
    const [duration, setDuration] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Timer state
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [startTime, setStartTime] = useState(null);
    const intervalRef = useRef(null);

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setTime(parseUTCTime(editEvent.time));
            if (details.duration_minutes) setDuration(String(details.duration_minutes));
            if (details.amount_ml) setAmount(String(details.amount_ml));
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    // Timer effect
    useEffect(() => {
        if (timerRunning) {
            intervalRef.current = setInterval(() => {
                setTimerSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timerRunning]);

    const formatTimerDisplay = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartTimer = () => {
        setStartTime(new Date());
        setTimerRunning(true);
        setTimerSeconds(0);
    };

    const handleStopTimer = () => {
        setTimerRunning(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    const handleSaveTimer = async () => {
        if (timerSeconds < 1) return;

        setSaving(true);
        try {
            await api.createPumping({
                baby_id: babyId,
                time: startTime.toISOString(),
                duration_minutes: Math.ceil(timerSeconds / 60),
                amount_ml: amount ? parseInt(amount) : null,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            toast.error('Failed to save pumping');
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitQuick = async (e) => {
        e.preventDefault();
        setSaving(true);

        const data = {
            baby_id: babyId,
            time: time.toISOString(),
            duration_minutes: duration ? parseInt(duration) : null,
            amount_ml: amount ? parseInt(amount) : null,
            notes: notes || null,
        };

        try {
            if (isEditing) {
                await api.updatePumping(editEvent.id, data);
            } else {
                await api.createPumping(data);
            }
            onSave();
        } catch (error) {
            console.error('Failed to save pumping:', error);
            toast.error('Failed to save pumping');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Milk size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Pumping</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Mode Toggle - only show when not editing */}
                    {!isEditing && (
                        <div className="form-group">
                            <div className="type-selector">
                                <button
                                    type="button"
                                    className={`type-btn ${mode === 'quick' ? 'active' : ''}`}
                                    onClick={() => { setMode('quick'); handleStopTimer(); }}
                                >
                                    <Pencil size={16} /> Quick Log
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${mode === 'timer' ? 'active' : ''}`}
                                    onClick={() => setMode('timer')}
                                >
                                    <Timer size={16} /> Timer
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Timer Mode */}
                    {mode === 'timer' && !isEditing ? (
                        <div className="timer-section">
                            <div className="timer-display">
                                {formatTimerDisplay(timerSeconds)}
                            </div>

                            <div className="timer-controls">
                                {!timerRunning ? (
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-lg"
                                        onClick={handleStartTimer}
                                        disabled={saving}
                                    >
                                        ▶️ Start Pumping
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-danger btn-lg"
                                        onClick={handleStopTimer}
                                    >
                                        ⏹️ Stop
                                    </button>
                                )}
                            </div>

                            {/* Amount and notes during timer */}
                            {(timerRunning || timerSeconds > 0) && (
                                <>
                                    <div className="form-group" style={{ marginTop: 'var(--space-lg)' }}>
                                        <label className="form-label">Amount (ml)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder="Optional"
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min="0"
                                            max="500"
                                        />
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
                                </>
                            )}

                            {/* Save button after timer stopped */}
                            {!timerRunning && timerSeconds > 0 && (
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                                        Cancel
                                    </button>
                                    <button
                                        type="button"
                                        className="btn btn-primary"
                                        onClick={handleSaveTimer}
                                        disabled={saving}
                                    >
                                        {saving ? 'Saving...' : 'Save Pumping'}
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        /* Quick Log Mode */
                        <form onSubmit={handleSubmitQuick}>
                            <div className="form-group">
                                <label className="form-label">Time</label>
                                <TimePicker value={time} onChange={setTime} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Duration (min)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Optional"
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        min="0"
                                        max="120"
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Amount (ml)</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder="Optional"
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="0"
                                        max="500"
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

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={onClose}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary" disabled={saving}>
                                    {saving ? 'Saving...' : 'Save Pumping'}
                                </button>
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

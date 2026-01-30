/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import TimePicker from './TimePicker';
import { Milk, Pencil, Timer } from 'lucide-react';
import { toast } from 'sonner';
import { parseUTCTime } from '../utils/parseTime';

// Helper to parse UTC time

interface PumpingModalProps { babyId: number; editEvent?: any; onClose: () => void; onSave: () => void; }
export default function PumpingModal({ babyId, editEvent, onClose, onSave }: PumpingModalProps) {
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
    const [startTime, setStartTime] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

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

    // Timer effect - calculates elapsed time from startTime for screen-off persistence
    useEffect(() => {
        if (timerRunning && startTime) {
            intervalRef.current = setInterval(() => {
                // Calculate elapsed seconds from startTime instead of incrementing
                // This ensures timer is accurate even if screen was off
                const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
                setTimerSeconds(elapsed);
            }, 1000);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timerRunning, startTime]);

    const formatTimerDisplay = (seconds: number): string => {
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
                time: startTime!.toISOString(),
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

    const handleSubmitQuick = async (e: React.FormEvent) => {
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
                        <>
                            {/* Timer Display */}
                            <div style={{
                                textAlign: 'center',
                                padding: 'var(--space-xl)',
                                background: timerRunning ? 'var(--pumping-bg)' : 'var(--surface)',
                                borderRadius: 'var(--radius-xl)',
                                marginBottom: 'var(--space-lg)'
                            }}>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: 'bold',
                                    fontFamily: 'monospace',
                                    color: timerRunning ? 'var(--pumping)' : 'var(--text)'
                                }}>
                                    {formatTimerDisplay(timerSeconds)}
                                </div>
                                {startTime && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                                        Started at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>

                            {/* Timer Controls */}
                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                {!timerRunning ? (
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-block btn-lg"
                                        onClick={handleStartTimer}
                                        style={{ background: 'var(--pumping)' }}
                                        disabled={saving}
                                    >
                                        ▶️ Start Pumping
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-block btn-lg"
                                        onClick={handleStopTimer}
                                    >
                                        ⏹️ Stop
                                    </button>
                                )}
                            </div>

                            {/* Amount and notes during/after timer */}
                            {(timerRunning || timerSeconds > 0) && (
                                <>
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
                        </>
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

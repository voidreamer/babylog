import { useState, useEffect } from 'react';
import { api } from '../api/client';
import TimePicker from './TimePicker';

// Helper to parse UTC time
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

export default function PumpingModal({ babyId, editEvent, onClose, onSave }) {
    const isEditing = !!editEvent;
    const [time, setTime] = useState(new Date());
    const [duration, setDuration] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

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

    const handleSubmit = async (e) => {
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
            alert('Failed to save pumping');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">🍶 {isEditing ? 'Edit' : 'Log'} Pumping</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
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
            </div>
        </div>
    );
}

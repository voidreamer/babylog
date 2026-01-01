import { useState } from 'react';
import { api } from '../api/client';

export default function FeedingModal({ babyId, onClose, onSave }) {
    const [type, setType] = useState('breast');
    const [time, setTime] = useState(new Date().toISOString().slice(0, 16));
    const [duration, setDuration] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await api.createFeeding({
                baby_id: babyId,
                time: new Date(time).toISOString(),
                type,
                duration_minutes: duration ? parseInt(duration) : null,
                amount_ml: amount ? parseInt(amount) : null,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            console.error('Failed to save feeding:', error);
            alert('Failed to save feeding');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">🍼 Log Feeding</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <div className="type-selector">
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'breast' ? 'active' : ''}`}
                                    onClick={() => setType('breast')}
                                >
                                    🤱 Breast
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'formula' ? 'active' : ''}`}
                                    onClick={() => setType('formula')}
                                >
                                    🍼 Formula
                                </button>
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Time</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                required
                            />
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

                            {type === 'formula' && (
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
                            )}
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
                            {saving ? 'Saving...' : 'Save Feeding'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

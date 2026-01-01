import { useState } from 'react';
import { api } from '../api/client';

export default function DiaperModal({ babyId, onClose, onSave }) {
    const [type, setType] = useState('pee');
    const [time, setTime] = useState(new Date().toISOString().slice(0, 16));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await api.createDiaper({
                baby_id: babyId,
                time: new Date(time).toISOString(),
                type,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            console.error('Failed to save diaper:', error);
            alert('Failed to save diaper change');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">🧷 Log Diaper Change</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">Type</label>
                            <div className="type-selector">
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'pee' ? 'active' : ''}`}
                                    onClick={() => setType('pee')}
                                >
                                    💧 Pee
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'poo' ? 'active' : ''}`}
                                    onClick={() => setType('poo')}
                                >
                                    💩 Poo
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'mixed' ? 'active' : ''}`}
                                    onClick={() => setType('mixed')}
                                >
                                    🔄 Both
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
                            {saving ? 'Saving...' : 'Save Diaper Change'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

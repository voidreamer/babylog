import { useState } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';

const resultOptions = [
    { value: 'success', label: '✓ Success', color: '#10b981' },
    { value: 'attempt', label: '~ Attempt', color: '#f59e0b' },
    { value: 'accident', label: '✗ Accident', color: '#ef4444' },
];

const typeOptions = [
    { value: 'pee', label: 'Pee' },
    { value: 'poo', label: 'Poo' },
    { value: 'both', label: 'Both' },
];

export default function PottyModal({ onClose, onSave }) {
    const { selectedBaby } = useBaby();
    const [result, setResult] = useState('success');
    const [pottyType, setPottyType] = useState('');
    const [time, setTime] = useState(new Date().toISOString().slice(0, 16));
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            await api.createPottyLog({
                baby_id: selectedBaby.id,
                time: new Date(time).toISOString(),
                result,
                potty_type: pottyType || null,
                notes: notes || null,
            });
            toast.success('Potty logged!');
            onSave();
        } catch (error) {
            console.error('Failed to log potty:', error);
            toast.error('Failed to log potty');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">🚽 Log Potty</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Result */}
                        <div className="form-group">
                            <label className="form-label">Result</label>
                            <div className="type-selector">
                                {resultOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`type-btn ${result === opt.value ? 'active' : ''}`}
                                        onClick={() => setResult(opt.value)}
                                        style={result === opt.value ? { borderColor: opt.color, color: opt.color } : {}}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Type */}
                        <div className="form-group">
                            <label className="form-label">Type (optional)</label>
                            <div className="type-selector">
                                {typeOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`type-btn ${pottyType === opt.value ? 'active' : ''}`}
                                        onClick={() => setPottyType(pottyType === opt.value ? '' : opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Time */}
                        <div className="form-group">
                            <label className="form-label">Time</label>
                            <input
                                type="datetime-local"
                                className="form-input"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                            />
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">Notes (optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder="Any notes..."
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
                            {saving ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

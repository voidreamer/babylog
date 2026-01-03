import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import TimePicker from './TimePicker';
import { CircleDot } from 'lucide-react';

// Parse UTC time string to local Date
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

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

export default function PottyModal({ editEvent, onClose, onSave }) {
    const { selectedBaby } = useBaby();
    const isEditing = !!editEvent;
    const [result, setResult] = useState('success');
    const [pottyType, setPottyType] = useState('');
    const [time, setTime] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setTime(parseUTCTime(editEvent.time));
            if (details.result) setResult(details.result);
            if (details.potty_type) setPottyType(details.potty_type);
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            const data = {
                baby_id: selectedBaby.id,
                time: time.toISOString(),
                result,
                potty_type: pottyType || null,
                notes: notes || null,
            };

            if (isEditing) {
                await api.updatePottyLog(editEvent.id, data);
            } else {
                await api.createPottyLog(data);
            }
            onSave();
        } catch (error) {
            console.error('Failed to log potty:', error);
            toast.error('Failed to save potty');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><CircleDot size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Potty</h2>
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
                            <TimePicker value={time} onChange={setTime} />
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

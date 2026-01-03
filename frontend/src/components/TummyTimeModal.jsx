import { useState } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import TimePicker from './TimePicker';
import { Sun } from 'lucide-react';

const durationOptions = [
    { value: 1, label: '1 min' },
    { value: 3, label: '3 min' },
    { value: 5, label: '5 min' },
    { value: 10, label: '10 min' },
    { value: 15, label: '15 min' },
];

export default function TummyTimeModal({ onClose, onSave }) {
    const { selectedBaby } = useBaby();
    const [duration, setDuration] = useState(5);
    const [time, setTime] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            await api.createTummyTime({
                baby_id: selectedBaby.id,
                start_time: time.toISOString(),
                duration_minutes: duration,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            console.error('Failed to log tummy time:', error);
            toast.error('Failed to log tummy time');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Sun size={20} style={{ marginRight: '8px' }} /> Log Tummy Time</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Duration */}
                        <div className="form-group">
                            <label className="form-label">Duration</label>
                            <div className="type-selector">
                                {durationOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`type-btn ${duration === opt.value ? 'active' : ''}`}
                                        onClick={() => setDuration(opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                            <div style={{ marginTop: 'var(--space-sm)' }}>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder="Custom minutes"
                                    value={duration}
                                    onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                                    min="1"
                                    max="60"
                                    style={{ width: '100%' }}
                                />
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
                                placeholder="Baby's mood, etc."
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

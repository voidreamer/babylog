import { useState } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import TimePicker from './TimePicker';
import { ShowerHead } from 'lucide-react';

export default function BathModal({ onClose, onSave }) {
    const { selectedBaby } = useBaby();
    const [time, setTime] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            await api.createBath({
                baby_id: selectedBaby.id,
                time: time.toISOString(),
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            console.error('Failed to log bath:', error);
            toast.error('Failed to log bath');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><ShowerHead size={20} style={{ marginRight: '8px' }} /> Log Bath</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
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
                                placeholder="Products used, etc."
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

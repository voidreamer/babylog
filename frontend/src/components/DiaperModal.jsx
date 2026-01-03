import { useState, useEffect } from 'react';
import { api } from '../api/client';
import TimePicker from './TimePicker';
import { Droplets, CircleDot, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// Helper to parse UTC time
const parseUTCTime = (timeStr) => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

export default function DiaperModal({ babyId, editEvent, onClose, onSave }) {
    const isEditing = !!editEvent;
    const [type, setType] = useState('pee');
    const [time, setTime] = useState(new Date());
    const [pooColor, setPooColor] = useState('');
    const [pooConsistency, setPooConsistency] = useState('');
    const [pooAmount, setPooAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setTime(parseUTCTime(editEvent.time));
            if (details.type) setType(details.type);
            if (details.poo_color) setPooColor(details.poo_color);
            if (details.poo_consistency) setPooConsistency(details.poo_consistency);
            if (details.poo_amount) setPooAmount(details.poo_amount);
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    const showPooDetails = type === 'poo' || type === 'mixed';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        const data = {
            baby_id: babyId,
            time: time.toISOString(),
            type,
            poo_color: showPooDetails && pooColor ? pooColor : null,
            poo_consistency: showPooDetails && pooConsistency ? pooConsistency : null,
            poo_amount: showPooDetails && pooAmount ? pooAmount : null,
            notes: notes || null,
        };

        try {
            if (isEditing) {
                await api.updateDiaper(editEvent.id, data);
            } else {
                await api.createDiaper(data);
            }
            onSave();
        } catch (error) {
            console.error('Failed to save diaper:', error);
            toast.error('Failed to save diaper change');
        } finally {
            setSaving(false);
        }
    };

    const colorOptions = [
        { value: 'yellow', label: 'Yellow', color: '#f4d03f' },
        { value: 'brown', label: 'Brown', color: '#8b4513' },
        { value: 'green', label: 'Green', color: '#27ae60' },
        { value: 'orange', label: 'Orange', color: '#e67e22' },
        { value: 'black', label: 'Black', color: '#2c3e50' },
        { value: 'red', label: 'Red', color: '#e74c3c' },
        { value: 'white', label: 'White', color: '#ecf0f1' },
    ];

    const consistencyOptions = [
        { value: 'liquid', label: 'Liquid' },
        { value: 'soft', label: 'Soft' },
        { value: 'formed', label: 'Formed' },
        { value: 'hard', label: 'Hard' },
        { value: 'pellets', label: 'Pellets' },
    ];

    const amountOptions = [
        { value: 'small', label: 'S' },
        { value: 'medium', label: 'M' },
        { value: 'large', label: 'L' },
        { value: 'blowout', label: 'XL' },
    ];

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Droplets size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Diaper Change</h2>
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
                                    <Droplets size={16} /> Pee
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'poo' ? 'active' : ''}`}
                                    onClick={() => setType('poo')}
                                >
                                    <CircleDot size={16} /> Poo
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${type === 'mixed' ? 'active' : ''}`}
                                    onClick={() => setType('mixed')}
                                >
                                    <RefreshCw size={16} /> Both
                                </button>
                            </div>
                        </div>

                        {showPooDetails && (
                            <>
                                <div className="form-group">
                                    <label className="form-label">Color</label>
                                    <div className="type-selector" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {colorOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`type-btn ${pooColor === opt.value ? 'active' : ''}`}
                                                onClick={() => setPooColor(pooColor === opt.value ? '' : opt.value)}
                                                style={{
                                                    fontSize: '0.85rem',
                                                    padding: '0.4rem 0.6rem',
                                                    minWidth: 'auto',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '0.4rem'
                                                }}
                                            >
                                                <span style={{
                                                    width: '12px',
                                                    height: '12px',
                                                    borderRadius: '50%',
                                                    background: opt.color,
                                                    border: opt.value === 'white' ? '1px solid var(--border)' : 'none'
                                                }} />
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Consistency</label>
                                    <div className="type-selector" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
                                        {consistencyOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`type-btn ${pooConsistency === opt.value ? 'active' : ''}`}
                                                onClick={() => setPooConsistency(pooConsistency === opt.value ? '' : opt.value)}
                                                style={{
                                                    fontSize: '0.85rem',
                                                    padding: '0.4rem 0.6rem',
                                                    minWidth: 'auto'
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Amount</label>
                                    <div className="type-selector">
                                        {amountOptions.map(opt => (
                                            <button
                                                key={opt.value}
                                                type="button"
                                                className={`type-btn ${pooAmount === opt.value ? 'active' : ''}`}
                                                onClick={() => setPooAmount(pooAmount === opt.value ? '' : opt.value)}
                                                style={{
                                                    fontSize: '0.9rem',
                                                    padding: '0.5rem 1rem',
                                                    minWidth: 'auto'
                                                }}
                                            >
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}

                        <div className="form-group">
                            <label className="form-label">Time</label>
                            <TimePicker value={time} onChange={setTime} />
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

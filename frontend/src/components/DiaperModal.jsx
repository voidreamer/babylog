import { useState } from 'react';
import { api } from '../api/client';
import TimePicker from './TimePicker';

export default function DiaperModal({ babyId, onClose, onSave }) {
    const [type, setType] = useState('pee');
    const [time, setTime] = useState(new Date());
    const [pooColor, setPooColor] = useState('');
    const [pooConsistency, setPooConsistency] = useState('');
    const [pooAmount, setPooAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    const showPooDetails = type === 'poo' || type === 'mixed';

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);

        try {
            await api.createDiaper({
                baby_id: babyId,
                time: time.toISOString(),
                type,
                poo_color: showPooDetails && pooColor ? pooColor : null,
                poo_consistency: showPooDetails && pooConsistency ? pooConsistency : null,
                poo_amount: showPooDetails && pooAmount ? pooAmount : null,
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

    const colorOptions = [
        { value: 'yellow', label: '🟡 Yellow', color: '#f4d03f' },
        { value: 'brown', label: '🟤 Brown', color: '#8b4513' },
        { value: 'green', label: '🟢 Green', color: '#27ae60' },
        { value: 'orange', label: '🟠 Orange', color: '#e67e22' },
        { value: 'black', label: '⚫ Black', color: '#2c3e50' },
        { value: 'red', label: '🔴 Red', color: '#e74c3c' },
        { value: 'white', label: '⚪ White', color: '#ecf0f1' },
    ];

    const consistencyOptions = [
        { value: 'liquid', label: '💧 Liquid' },
        { value: 'soft', label: '🍦 Soft' },
        { value: 'formed', label: '🍌 Formed' },
        { value: 'hard', label: '🪨 Hard' },
        { value: 'pellets', label: '⚫ Pellets' },
    ];

    const amountOptions = [
        { value: 'small', label: 'S' },
        { value: 'medium', label: 'M' },
        { value: 'large', label: 'L' },
        { value: 'blowout', label: '💥' },
    ];

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
                                                    minWidth: 'auto'
                                                }}
                                            >
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

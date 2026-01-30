/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import TimePicker from './TimePicker';
import { Pill } from 'lucide-react';
import { parseUTCTime } from '../utils/parseTime';
import { useTranslation } from 'react-i18next';

// Parse UTC time string to local Date

// Common baby supplements
const supplementOptions = [
    { value: 'vitamin_d', label: 'Vitamin D', defaultDosage: '400 IU' },
    { value: 'iron', label: 'Iron', defaultDosage: '1ml' },
    { value: 'dha', label: 'DHA/Omega-3', defaultDosage: '' },
    { value: 'probiotic', label: 'Probiotic', defaultDosage: '' },
    { value: 'multivitamin', label: 'Multivitamin', defaultDosage: '' },
    { value: 'other', label: 'Other', defaultDosage: '' },
];

interface SupplementModalProps { editEvent?: any; onClose: () => void; onSave: () => void; }
export default function SupplementModal({ editEvent, onClose, onSave }: SupplementModalProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const isEditing = !!editEvent;
    const [supplementName, setSupplementName] = useState('vitamin_d');
    const [dosage, setDosage] = useState('400 IU');
    const [time, setTime] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setTime(parseUTCTime(editEvent.time));
            if (details.name) setSupplementName(details.name);
            if (details.dosage) setDosage(details.dosage);
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    // Update dosage when supplement type changes
    const handleSupplementChange = (value: string) => {
        setSupplementName(value);
        const option = supplementOptions.find(o => o.value === value);
        if (option?.defaultDosage && !isEditing) {
            setDosage(option.defaultDosage);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            const data = {
                baby_id: selectedBaby.id,
                time: time.toISOString(),
                name: supplementName,
                dosage: dosage || null,
                notes: notes || null,
            };

            if (isEditing) {
                await api.updateSupplement(editEvent.id, data);
            } else {
                await api.createSupplement(data);
            }
            onSave();
        } catch (error) {
            console.error('Failed to log supplement:', error);
            toast.error(t('toast_failedToSaveSupplement'));
        } finally {
            setSaving(false);
        }
    };

    const getSupplementLabel = (value: string) => {
        return supplementOptions.find(o => o.value === value)?.label || value;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Pill size={20} style={{ marginRight: '8px' }} /> {isEditing ? 'Edit' : 'Log'} Supplement</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Supplement Type */}
                        <div className="form-group">
                            <label className="form-label">Supplement</label>
                            <div className="type-selector" style={{ flexWrap: 'wrap' }}>
                                {supplementOptions.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`type-btn ${supplementName === opt.value ? 'active' : ''}`}
                                        onClick={() => handleSupplementChange(opt.value)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dosage */}
                        <div className="form-group">
                            <label className="form-label">Dosage (optional)</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('placeholder_eg400Iu1ml')}
                                value={dosage}
                                onChange={(e) => setDosage(e.target.value)}
                            />
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
                                placeholder={t('placeholder_anyNotes')}
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

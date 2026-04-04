/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import { showApiError } from '../utils/errorHandling';
import TimePicker from './TimePicker';
import { Pill, X } from 'lucide-react';
import { parseUTCTime } from '../utils/parseTime';
import { useTranslation } from 'react-i18next';
import { hapticNotification } from '../utils/haptics';

// Parse UTC time string to local Date

// Common baby supplements
const SUPPLEMENT_VALUES = [
    { value: 'vitamin_d', key: 'vitaminD', defaultDosage: '400 IU' },
    { value: 'iron', key: 'iron', defaultDosage: '1ml' },
    { value: 'dha', key: 'dhaOmega3', defaultDosage: '' },
    { value: 'probiotic', key: 'probiotic', defaultDosage: '' },
    { value: 'multivitamin', key: 'multivitamin', defaultDosage: '' },
    { value: 'other', key: 'other', defaultDosage: '' },
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
        const option = SUPPLEMENT_VALUES.find(o => o.value === value);
        if (option?.defaultDosage && !isEditing) {
            setDosage(option.defaultDosage);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBaby) return;

        if (notes && notes.length > 500) {
            toast.error(t('toast_notesMustBeLessThan500Characters'));
            return;
        }

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
            hapticNotification();
            onSave();
        } catch (error) {
            console.error('Failed to log supplement:', error);
            showApiError(error, t('toast_failedToSaveSupplement'), t);
        } finally {
            setSaving(false);
        }
    };

    const getSupplementLabel = (value: string) => {
        const opt = SUPPLEMENT_VALUES.find(o => o.value === value);
        return opt ? t(`supplement.${opt.key}`) : value;
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Pill size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('supplement.title')}</h2>
                    <button className="modal-close" onClick={onClose} aria-label={t('common:close')}><X size={18} /></button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Supplement Type */}
                        <div className="form-group">
                            <label className="form-label">{t('supplement.title')}</label>
                            <div className="type-selector" style={{ flexWrap: 'wrap' }}>
                                {SUPPLEMENT_VALUES.map((opt) => (
                                    <button
                                        key={opt.value}
                                        type="button"
                                        className={`type-btn ${supplementName === opt.value ? 'active' : ''}`}
                                        onClick={() => handleSupplementChange(opt.value)}
                                    >
                                        {t(`supplement.${opt.key}`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dosage */}
                        <div className="form-group">
                            <label className="form-label">{t('supplement.dosageOptional')}</label>
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
                            <label className="form-label">{t('modal.time')}</label>
                            <TimePicker value={time} onChange={setTime} />
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">{t('modal.notesOptional')}</label>
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
                            {t('common:cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={saving}>
                            {saving ? t('common:saving') : t('common:save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

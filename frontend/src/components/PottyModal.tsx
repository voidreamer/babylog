/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import TimePicker from './TimePicker';
import { CircleDot } from 'lucide-react';
import { useTranslation } from 'react-i18next';

// Parse UTC time string to local Date
const parseUTCTime = (timeStr: any): Date => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

// Labels will be filled by component using t()
const RESULT_VALUES = ['success', 'attempt', 'accident'] as const;
const RESULT_ICONS = { success: '✓', attempt: '~', accident: '✗' };
const RESULT_COLORS = { success: '#10b981', attempt: '#f59e0b', accident: '#ef4444' };
const TYPE_VALUES = ['pee', 'poo', 'both'] as const;

interface PottyModalProps { editEvent?: any; onClose: () => void; onSave: () => void; }
export default function PottyModal({ editEvent, onClose, onSave }: PottyModalProps) {
    const { t } = useTranslation('dashboard');
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
            toast.error(t('toast_failedToSavePotty'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><CircleDot size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('potty.title')}</h2>
                    <button className="modal-close" onClick={onClose} aria-label={t('common:close')}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Result */}
                        <div className="form-group">
                            <label className="form-label">{t('potty.result')}</label>
                            <div className="type-selector">
                                {RESULT_VALUES.map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        className={`type-btn ${result === val ? 'active' : ''}`}
                                        onClick={() => setResult(val)}
                                        style={result === val ? { borderColor: RESULT_COLORS[val], color: RESULT_COLORS[val] } : {}}
                                    >
                                        {RESULT_ICONS[val]} {t(`potty.${val}Label`)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Type */}
                        <div className="form-group">
                            <label className="form-label">{t('potty.typeOptional')}</label>
                            <div className="type-selector">
                                {TYPE_VALUES.map((val) => (
                                    <button
                                        key={val}
                                        type="button"
                                        className={`type-btn ${pottyType === val ? 'active' : ''}`}
                                        onClick={() => setPottyType(pottyType === val ? '' : val)}
                                    >
                                        {t(`potty.${val}`)}
                                    </button>
                                ))}
                            </div>
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

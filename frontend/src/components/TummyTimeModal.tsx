/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import { showApiError } from '../utils/errorHandling';
import TimePicker from './TimePicker';
import { Sun } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { hapticNotification } from '../utils/haptics';

// Parse UTC time string to local Date
const parseUTCTime = (timeStr: any): Date => {
    if (!timeStr) return new Date();
    const utcTime = timeStr.endsWith('Z') ? timeStr : timeStr + 'Z';
    return new Date(utcTime);
};

const durationValues = [1, 3, 5, 10, 15] as const;
const durationKeys = ['1min', '3min', '5min', '10min', '15min'] as const;

interface TummyTimeModalProps { editEvent?: any; onClose: () => void; onSave: () => void; }
export default function TummyTimeModal({ editEvent, onClose, onSave }: TummyTimeModalProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const isEditing = !!editEvent;
    const [duration, setDuration] = useState(5);
    const [time, setTime] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setTime(parseUTCTime(editEvent.time));
            if (details.duration_minutes) setDuration(details.duration_minutes);
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
                start_time: time.toISOString(),
                duration_minutes: duration,
                notes: notes || null,
            };

            if (isEditing) {
                await api.updateTummyTime(editEvent.id, data);
            } else {
                await api.createTummyTime(data);
            }
            hapticNotification();
            onSave();
        } catch (error) {
            console.error('Failed to log tummy time:', error);
            showApiError(error, t('toast_failedToSaveTummyTime'), t);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Sun size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('tummyTime.title')}</h2>
                    <button className="modal-close" onClick={onClose} aria-label={t('common:close')}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Duration */}
                        <div className="form-group">
                            <label className="form-label">{t('tummyTime.duration')}</label>
                            <div className="type-selector">
                                {durationValues.map((val, i) => (
                                    <button
                                        key={val}
                                        type="button"
                                        className={`type-btn ${duration === val ? 'active' : ''}`}
                                        onClick={() => setDuration(val)}
                                    >
                                        {t(`tummyTime.durationOptions.${durationKeys[i]}`)}
                                    </button>
                                ))}
                            </div>
                            <div style={{ marginTop: 'var(--space-sm)' }}>
                                <input
                                    type="number"
                                    className="form-input"
                                    placeholder={t('placeholder_customMinutes')}
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
                            <label className="form-label">{t('modal.time')}</label>
                            <TimePicker value={time} onChange={setTime} />
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">{t('modal.notesOptional')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('placeholder_babysMoodEtc')}
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

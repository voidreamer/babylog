/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Moon } from 'lucide-react';
import { toast } from 'sonner';
import { showApiError } from '../utils/errorHandling';
import TimePicker from './TimePicker';
import { parseUTCTime } from '../utils/parseTime';
import { useTranslation } from 'react-i18next';
import { hapticNotification } from '../utils/haptics';


interface SleepModalProps { babyId: number; editEvent?: any; onClose: () => void; onSave: () => void; }
export default function SleepModal({ babyId, editEvent, onClose, onSave }: SleepModalProps) {
    const { t } = useTranslation('dashboard');
    const isEditing = !!editEvent;
    const [startTime, setStartTime] = useState(new Date());
    const [endTime, setEndTime] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setStartTime(parseUTCTime(editEvent.time));
            if (details.end_time) {
                setEndTime(parseUTCTime(details.end_time));
            }
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;

        if (notes && notes.length > 500) {
            toast.error(t('toast_notesMustBeLessThan500Characters'));
            return;
        }

        setSaving(true);

        const data = {
            baby_id: babyId,
            start_time: startTime.toISOString(),
            end_time: endTime.toISOString(),
            notes: notes || null,
        };

        try {
            if (isEditing) {
                await api.updateSleep(editEvent.id, data);
            } else {
                await api.createSleep(data);
            }
            hapticNotification();
            onSave();
        } catch (error) {
            console.error('Failed to log sleep:', error);
            showApiError(error, t('toast_failedToLogSleep'), t);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Moon size={20} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('sleep.title')}</h2>
                    <button className="modal-close" onClick={onClose} aria-label={t('common:close')}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        <div className="form-group">
                            <label className="form-label">{t('sleep.startTime')}</label>
                            <TimePicker value={startTime} onChange={setStartTime} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('sleep.endTime')}</label>
                            <TimePicker value={endTime} onChange={setEndTime} />
                        </div>

                        <div className="form-group">
                            <label className="form-label">{t('modal.notes')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('placeholder_optionalNotes')}
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
                            {saving ? t('common:saving') : (isEditing ? t('sleep.saveChanges') : t('sleep.logSleep'))}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import TimePicker from './TimePicker';
import { ShowerHead } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { parseUTCTime } from '../utils/parseTime';

// Parse UTC time string to local Date

interface BathModalProps { editEvent?: any; onClose: () => void; onSave: () => void; }
export default function BathModal({ editEvent, onClose, onSave }: BathModalProps) {
    const { selectedBaby } = useBaby();
    const { t } = useTranslation('common');
    const isEditing = !!editEvent;
    const [time, setTime] = useState(new Date());
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setTime(parseUTCTime(editEvent.time));
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedBaby) return;

        setSaving(true);
        try {
            const data = {
                baby_id: selectedBaby.id,
                time: time.toISOString(),
                notes: notes || null,
            };

            if (isEditing) {
                await api.updateBath(editEvent.id, data);
            } else {
                await api.createBath(data);
            }
            onSave();
        } catch (error) {
            console.error('Failed to log bath:', error);
            toast.error(t('errors.failedToSave'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><ShowerHead size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('editBath') : t('logBath')}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Time */}
                        <div className="form-group">
                            <label className="form-label">{t('time')}</label>
                            <TimePicker value={time} onChange={setTime} />
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">{t('notes')} ({t('optional')})</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('productsUsed')}
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
                            {saving ? t('saving') : t('save')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

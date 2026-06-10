/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useBaby } from '../hooks/useBaby';
import { toast } from 'sonner';
import { showApiError } from '../utils/errorHandling';
import TimePicker from './TimePicker';
import { UtensilsCrossed, ThumbsUp, Minus, ThumbsDown, AlertTriangle } from 'lucide-react';
import { parseUTCTime } from '../utils/parseTime';
import { useTranslation } from 'react-i18next';
import { hapticNotification } from '../utils/haptics';

const AMOUNT_OPTIONS = ['taste', 'small', 'medium', 'large'];
const REACTION_OPTIONS = ['liked', 'neutral', 'disliked', 'allergic'];

const REACTION_ICONS: Record<string, any> = {
    liked: ThumbsUp,
    neutral: Minus,
    disliked: ThumbsDown,
    allergic: AlertTriangle,
};

interface SolidModalProps { editEvent?: any; onClose: () => void; onSave: () => void; }
export default function SolidModal({ editEvent, onClose, onSave }: SolidModalProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const isEditing = !!editEvent;
    const [time, setTime] = useState(new Date());
    const [foodName, setFoodName] = useState('');
    const [amount, setAmount] = useState<string>('small');
    const [reaction, setReaction] = useState<string>('neutral');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setTime(parseUTCTime(editEvent.time));
            if (details.food_name) setFoodName(details.food_name);
            if (details.amount) setAmount(details.amount);
            if (details.reaction) setReaction(details.reaction);
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (saving) return;
        if (!selectedBaby) return;

        if (!foodName.trim()) {
            toast.error(t('solid.foodNameRequired', { defaultValue: 'Please enter a food name' }));
            return;
        }

        setSaving(true);
        try {
            const data = {
                baby_id: selectedBaby.id,
                time: time.toISOString(),
                food_name: foodName.trim(),
                amount: amount || null,
                reaction: reaction || null,
                notes: notes || null,
            };

            if (isEditing) {
                await api.updateSolid(editEvent.id, data);
            } else {
                await api.createSolid(data);
            }
            hapticNotification();
            onSave();
        } catch (error) {
            console.error('Failed to log solid food:', error);
            showApiError(error, t('solid.failedToLog', { defaultValue: 'Failed to log solid food' }), t);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" role="dialog" aria-modal="true" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title">
                        <UtensilsCrossed size={20} />
                        {isEditing ? t('modal.edit') : t('modal.log')} {t('solid.title', { defaultValue: 'Solids' })}
                    </h2>
                    <button className="modal-close" onClick={onClose} aria-label={t('common:close')}>×</button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="modal-body">
                        {/* Time */}
                        <div className="form-group">
                            <label className="form-label">{t('modal.time')}</label>
                            <TimePicker value={time} onChange={setTime} />
                        </div>

                        {/* Food name */}
                        <div className="form-group">
                            <label className="form-label">{t('solid.foodName', { defaultValue: 'Food' })}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('solid.foodPlaceholder', { defaultValue: 'e.g., avocado, banana, rice cereal' })}
                                value={foodName}
                                onChange={(e) => setFoodName(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {/* Amount */}
                        <div className="form-group">
                            <label className="form-label">{t('solid.amount', { defaultValue: 'Amount' })}</label>
                            <div className="btn-group">
                                {AMOUNT_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`btn-group-item ${amount === opt ? 'active' : ''}`}
                                        onClick={() => setAmount(opt)}
                                    >
                                        {t(`solid.amount_${opt}`, { defaultValue: opt })}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Reaction */}
                        <div className="form-group">
                            <label className="form-label">{t('solid.reaction', { defaultValue: 'Reaction' })}</label>
                            <div className="btn-group">
                                {REACTION_OPTIONS.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`btn-group-item ${reaction === opt ? 'active' : ''}`}
                                        onClick={() => setReaction(opt)}
                                    >
                                        {(() => { const Icon = REACTION_ICONS[opt]; return Icon ? <Icon size={14} style={{ marginRight: 'var(--space-xs)' }} /> : null; })()}
                                        {t(`solid.reaction_${opt}`, { defaultValue: opt })}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="form-group">
                            <label className="form-label">{t('modal.notesOptional')}</label>
                            <input
                                type="text"
                                className="form-input"
                                placeholder={t('solid.notesPlaceholder', { defaultValue: 'Any reactions, preferences...' })}
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

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect, useRef } from 'react';
import { api } from '../api/client';
import TimePicker from './TimePicker';
import { Baby, Pencil, Timer, User } from 'lucide-react';
import { toast } from 'sonner';
import { parseUTCTime } from '../utils/parseTime';
import { useTranslation } from 'react-i18next';

// Helper to parse UTC time

interface FeedingModalProps { babyId: number; editEvent?: any; onClose: () => void; onSave: () => void; }
export default function FeedingModal({ babyId, editEvent, onClose, onSave }: FeedingModalProps) {
    const { t } = useTranslation('dashboard');
    const isEditing = !!editEvent;
    const [mode, setMode] = useState('quick'); // 'quick' or 'timer'

    // Remember last-used feeding preferences
    const [feedMethod, setFeedMethod] = useState(() => {
        return localStorage.getItem('lastFeedMethod') || 'breast';
    });
    const [bottleType, setBottleType] = useState(() => {
        return localStorage.getItem('lastBottleType') || 'breastmilk';
    });

    const [time, setTime] = useState(new Date());
    const [duration, setDuration] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const [saving, setSaving] = useState(false);

    // Timer state
    const [timerRunning, setTimerRunning] = useState(false);
    const [timerSeconds, setTimerSeconds] = useState(0);
    const [startTime, setStartTime] = useState<Date | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Save preferences when they change
    const handleFeedMethodChange = (method: string) => {
        setFeedMethod(method);
        localStorage.setItem('lastFeedMethod', method);
    };

    const handleBottleTypeChange = (type: string) => {
        setBottleType(type);
        localStorage.setItem('lastBottleType', type);
    };

    // Initialize from editEvent when editing
    useEffect(() => {
        if (editEvent && editEvent.details) {
            const details = editEvent.details;
            setTime(parseUTCTime(editEvent.time));

            // Determine feed method and bottle type from type
            if (details.type === 'breast') {
                setFeedMethod('breast');
            } else {
                setFeedMethod('bottle');
                // Handle both old 'bottle' and new 'breastmilk_bottle' types
                setBottleType(details.type === 'formula' ? 'formula' : 'breastmilk');
            }

            if (details.duration_minutes) setDuration(String(details.duration_minutes));
            if (details.amount_ml) setAmount(String(details.amount_ml));
            if (details.notes) setNotes(details.notes);
        }
    }, [editEvent]);

    // Timer effect - calculates elapsed time from startTime for screen-off persistence
    useEffect(() => {
        if (timerRunning && startTime) {
            intervalRef.current = setInterval(() => {
                // Calculate elapsed seconds from startTime instead of incrementing
                // This ensures timer is accurate even if screen was off
                const elapsed = Math.floor((Date.now() - startTime.getTime()) / 1000);
                setTimerSeconds(elapsed);
            }, 1000);
        }
        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [timerRunning, startTime]);

    const formatTimerDisplay = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleStartTimer = () => {
        setStartTime(new Date());
        setTimerRunning(true);
        setTimerSeconds(0);
    };

    const handleStopTimer = () => {
        setTimerRunning(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
    };

    // Determine the type to save based on feeding method and bottle type
    // Note: Backend only accepts 'formula', 'breast', 'bottle', 'solid'
    // Display logic handles showing 'bottle' as 'Breastmilk Bottle'
    const getSaveType = () => {
        if (feedMethod === 'breast') return 'breast';
        return bottleType === 'formula' ? 'formula' : 'bottle';
    };

    const handleSaveTimer = async () => {
        if (timerSeconds < 1) return;

        // Validate amount if provided
        if (amount && (isNaN(parseInt(amount)) || parseInt(amount) < 0 || parseInt(amount) > 500)) {
            toast.error(t('toast_amountMustBeBetween0And500Ml'));
            return;
        }

        // Validate notes length
        if (notes && notes.length > 500) {
            toast.error(t('toast_notesMustBeLessThan500Characters'));
            return;
        }

        setSaving(true);
        try {
            await api.createFeeding({
                baby_id: babyId,
                time: startTime!.toISOString(),
                type: getSaveType(),
                duration_minutes: Math.ceil(timerSeconds / 60),
                amount_ml: amount ? parseInt(amount) : null,
                notes: notes || null,
            });
            onSave();
        } catch (error) {
            toast.error(t('toast_failedToSaveFeeding'));
        } finally {
            setSaving(false);
        }
    };

    const handleSubmitQuick = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validate duration if provided
        if (duration && (isNaN(parseInt(duration)) || parseInt(duration) < 0 || parseInt(duration) > 120)) {
            toast.error(t('toast_durationMustBeBetween0And120Minute'));
            return;
        }

        // Validate amount if provided
        if (amount && (isNaN(parseInt(amount)) || parseInt(amount) < 0 || parseInt(amount) > 500)) {
            toast.error(t('toast_amountMustBeBetween0And500Ml'));
            return;
        }

        // Validate notes length
        if (notes && notes.length > 500) {
            toast.error(t('toast_notesMustBeLessThan500Characters'));
            return;
        }

        setSaving(true);

        const data = {
            baby_id: babyId,
            time: time.toISOString(),
            type: getSaveType(),
            duration_minutes: duration ? parseInt(duration) : null,
            amount_ml: amount ? parseInt(amount) : null,
            notes: notes || null,
        };

        try {
            if (isEditing) {
                await api.updateFeeding(editEvent.id, data);
            } else {
                await api.createFeeding(data);
            }
            onSave();
        } catch (error) {
            toast.error(t('toast_failedToSaveFeeding'));
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h2 className="modal-title"><Baby size={20} style={{ marginRight: '8px' }} /> {isEditing ? t('modal.edit') : t('modal.log')} {t('feeding.title')}</h2>
                    <button className="modal-close" onClick={onClose}>×</button>
                </div>

                <div className="modal-body">
                    {/* Mode Toggle */}
                    <div className="form-group">
                        <div className="type-selector">
                            <button
                                type="button"
                                className={`type-btn ${mode === 'quick' ? 'active' : ''}`}
                                onClick={() => { setMode('quick'); handleStopTimer(); }}
                            >
                                <Pencil size={16} /> {t('feeding.quickLog')}
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${mode === 'timer' ? 'active' : ''}`}
                                onClick={() => setMode('timer')}
                            >
                                <Timer size={16} /> {t('feeding.timer')}
                            </button>
                        </div>
                    </div>

                    {/* Feeding Method Selection */}
                    <div className="form-group">
                        <label className="form-label">{t('feeding.method')}</label>
                        <div className="type-selector">
                            <button
                                type="button"
                                className={`type-btn ${feedMethod === 'breast' ? 'active' : ''}`}
                                onClick={() => handleFeedMethodChange('breast')}
                            >
                                <User size={16} /> {t('feeding.breast')}
                            </button>
                            <button
                                type="button"
                                className={`type-btn ${feedMethod === 'bottle' ? 'active' : ''}`}
                                onClick={() => handleFeedMethodChange('bottle')}
                            >
                                <Baby size={16} /> {t('feeding.bottle')}
                            </button>
                        </div>
                    </div>

                    {/* Bottle Type Sub-selection */}
                    {feedMethod === 'bottle' && (
                        <div className="form-group">
                            <label className="form-label">{t('feeding.bottleContents')}</label>
                            <div className="type-selector">
                                <button
                                    type="button"
                                    className={`type-btn ${bottleType === 'breastmilk' ? 'active' : ''}`}
                                    onClick={() => handleBottleTypeChange('breastmilk')}
                                >
                                    {t('feeding.breastMilk')}
                                </button>
                                <button
                                    type="button"
                                    className={`type-btn ${bottleType === 'formula' ? 'active' : ''}`}
                                    onClick={() => handleBottleTypeChange('formula')}
                                >
                                    {t('feeding.formula')}
                                </button>
                            </div>
                        </div>
                    )}

                    {mode === 'timer' ? (
                        <>
                            {/* Timer Display */}
                            <div style={{
                                textAlign: 'center',
                                padding: 'var(--space-xl)',
                                background: timerRunning ? 'var(--feeding-bg)' : 'var(--surface)',
                                borderRadius: 'var(--radius-xl)',
                                marginBottom: 'var(--space-lg)'
                            }}>
                                <div style={{
                                    fontSize: '3rem',
                                    fontWeight: 'bold',
                                    fontFamily: 'monospace',
                                    color: timerRunning ? 'var(--feeding)' : 'var(--text)'
                                }}>
                                    {formatTimerDisplay(timerSeconds)}
                                </div>
                                {startTime && (
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: 'var(--space-sm)' }}>
                                        Started at {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                )}
                            </div>

                            {/* Timer Controls */}
                            <div style={{ display: 'flex', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
                                {!timerRunning ? (
                                    <button
                                        type="button"
                                        className="btn btn-primary btn-block btn-lg"
                                        onClick={handleStartTimer}
                                        style={{ background: 'var(--feeding)' }}
                                    >
                                        ▶️ {t('feeding.startFeeding')}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn btn-secondary btn-block btn-lg"
                                        onClick={handleStopTimer}
                                    >
                                        ⏹️ {t('feeding.stop')}
                                    </button>
                                )}
                            </div>

                            {/* Amount for bottle */}
                            {feedMethod === 'bottle' && (
                                <div className="form-group">
                                    <label className="form-label">{t('feeding.amountMl')}</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder={t('placeholder_optional')}
                                        value={amount}
                                        onChange={(e) => setAmount(e.target.value)}
                                        min="0"
                                        max="500"
                                    />
                                </div>
                            )}

                            <div className="form-group">
                                <label className="form-label">{t('modal.notes')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={t('placeholder_optionalNotes')}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    maxLength={500}
                                />
                            </div>
                        </>
                    ) : (
                        /* Quick Log Mode */
                        <form id="quick-form" onSubmit={handleSubmitQuick}>
                            <div className="form-group">
                                <label className="form-label">{t('modal.time')}</label>
                                <TimePicker value={time} onChange={setTime} />
                            </div>

                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">{t('feeding.durationMin')}</label>
                                    <input
                                        type="number"
                                        className="form-input"
                                        placeholder={t('placeholder_optional')}
                                        value={duration}
                                        onChange={(e) => setDuration(e.target.value)}
                                        min="0"
                                        max="120"
                                    />
                                </div>

                                {feedMethod === 'bottle' && (
                                    <div className="form-group">
                                        <label className="form-label">Amount (ml)</label>
                                        <input
                                            type="number"
                                            className="form-input"
                                            placeholder={t('placeholder_optional')}
                                            value={amount}
                                            onChange={(e) => setAmount(e.target.value)}
                                            min="0"
                                            max="500"
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="form-group">
                                <label className="form-label">{t('modal.notes')}</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    placeholder={t('placeholder_optionalNotes')}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    maxLength={500}
                                />
                            </div>
                        </form>
                    )}
                </div>

                <div className="modal-footer">
                    <button type="button" className="btn btn-secondary" onClick={onClose}>
                        {t('common:cancel')}
                    </button>
                    {mode === 'timer' ? (
                        <button
                            type="button"
                            className="btn btn-primary"
                            disabled={saving || timerSeconds < 1}
                            onClick={handleSaveTimer}
                        >
                            {saving ? t('common:saving') : t('feeding.saveFeeding')}
                        </button>
                    ) : (
                        <button type="submit" form="quick-form" className="btn btn-primary" disabled={saving}>
                            {saving ? 'Saving...' : 'Save Feeding'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

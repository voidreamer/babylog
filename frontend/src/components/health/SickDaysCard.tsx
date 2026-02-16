/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Thermometer, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { showApiError } from '../../utils/errorHandling';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { useTranslation } from 'react-i18next';
import { useUnits } from '../../hooks/useUnits';
import ConfirmModal from '../ConfirmModal';

const COMMON_SYMPTOMS = [
    'fever',
    'cough',
    'runny_nose',
    'congestion',
    'vomiting',
    'diarrhea',
    'rash',
    'ear_pain',
    'fussy',
    'poor_appetite',
    'lethargy',
    'sore_throat',
];

// symptomLabels will be created inside component using t()

interface SickDaysCardProps { baby: any; sickDays: any[]; onSickDayAdded?: () => void; onSickDayDeleted?: () => void; }
export default function SickDaysCard({ baby, sickDays, onSickDayAdded, onSickDayDeleted }: SickDaysCardProps) {
    const { t } = useTranslation('health');
    const { formatTemp, parseTemp, tempUnit, isImperial } = useUnits();
    const symptomLabels: Record<string, string> = {
        fever: t('sickDays.symptomLabels.fever'),
        cough: t('sickDays.symptomLabels.cough'),
        runny_nose: t('sickDays.symptomLabels.runny_nose'),
        congestion: t('sickDays.symptomLabels.congestion'),
        vomiting: t('sickDays.symptomLabels.vomiting'),
        diarrhea: t('sickDays.symptomLabels.diarrhea'),
        rash: t('sickDays.symptomLabels.rash'),
        ear_pain: t('sickDays.symptomLabels.ear_pain'),
        fussy: t('sickDays.symptomLabels.fussy'),
        poor_appetite: t('sickDays.symptomLabels.poor_appetite'),
        lethargy: t('sickDays.symptomLabels.lethargy'),
        sore_throat: t('sickDays.symptomLabels.sore_throat'),
    };
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
    const [formData, setFormData] = useState<{ date: string; symptoms: string[]; temperature: string; notes: string; }>({
        date: new Date().toISOString().split('T')[0],
        symptoms: [],
        temperature: '',
        notes: '',
    });

    // Show only recent sick days (last 10)
    const recentSickDays = sickDays?.slice(0, 10) || [];

    const toggleSymptom = (symptom: string) => {
        setFormData(prev => ({
            ...prev,
            symptoms: prev.symptoms.includes(symptom)
                ? prev.symptoms.filter(s => s !== symptom)
                : [...prev.symptoms, symptom]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.symptoms.length === 0 && !formData.temperature && !formData.notes) {
            toast.error(t('toast_pleaseAddAtLeastOneSymptomTemperat'));
            return;
        }

        setSaving(true);
        try {
            const data = {
                baby_id: baby.id,
                date: formData.date,
                symptoms: formData.symptoms,
                temperature: formData.temperature ? parseTemp(parseFloat(formData.temperature)) : null,
                notes: formData.notes || null,
            };

            await api.createSickDay(data);
            toast.success(t('toast_sickDayLogged'));
            setFormData({
                date: new Date().toISOString().split('T')[0],
                symptoms: [],
                temperature: '',
                notes: '',
            });
            setIsAdding(false);
            if (onSickDayAdded) onSickDayAdded();
        } catch (error) {
            showApiError(error, t('failedToSave'), t);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.deleteSickDay(id);
            toast.success(t('toast_sickDayRemoved'));
            if (onSickDayDeleted) onSickDayDeleted();
        } catch (error) {
            showApiError(error, t('failedToDelete'), t);
        }
    };

    const formatSickDate = (dateStr: string): string => {
        try {
            const date = parseISO(dateStr);
            if (isToday(date)) return t('common:time.today');
            if (isYesterday(date)) return t('common:time.yesterday');
            return format(date, 'MMM d');
        } catch {
            return dateStr;
        }
    };

    const getTemperatureStatus = (temp: number | string | null): string | null => {
        if (!temp) return null;
        const t = parseFloat(String(temp));
        if (t >= 39) return 'high-fever';
        if (t >= 38) return 'fever';
        if (t >= 37.5) return 'elevated';
        return 'normal';
    };

    return (
        <div className="health-card sick-days-card">
            <div className="health-card-header">
                <h3 className="health-card-title">
                    <Thermometer size={18} />
                    {t('sickDays.title')}
                </h3>
                {sickDays?.length > 0 && (
                    <span className="health-card-count">{t('sickDays.recorded', { count: sickDays.length })}</span>
                )}
            </div>

            {/* Recent Sick Days List */}
            {recentSickDays.length > 0 ? (
                <div className="sick-days-list">
                    {recentSickDays.map((day) => (
                        <div key={day.id} className="sick-day-item">
                            <div className="sick-day-header">
                                <span className="sick-day-date">{formatSickDate(day.date)}</span>
                                {day.temperature && (
                                    <span className={`sick-day-temp ${getTemperatureStatus(day.temperature)}`}>
                                        {formatTemp(day.temperature)}
                                    </span>
                                )}
                                <button
                                    className="sick-day-delete"
                                    onClick={() => setConfirmDeleteId(day.id)}
                                    aria-label={t('arialabel_deleteSickDay')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {day.symptoms?.length > 0 && (
                                <div className="sick-day-symptoms">
                                    {day.symptoms.map((s: string) => (
                                        <span key={s} className="symptom-chip">
                                            {symptomLabels[s] || s}
                                        </span>
                                    ))}
                                </div>
                            )}
                            {day.notes && (
                                <p className="sick-day-notes">{day.notes}</p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="health-card-empty">{t('sickDays.noSickDays')}</p>
            )}

            {/* Add Form */}
            {isAdding ? (
                <form onSubmit={handleSubmit} className="sick-day-form">
                    <div className="sick-day-form-row">
                        <input
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                            className="sick-day-date-input"
                        />
                        <div className="sick-day-temp-input-wrapper">
                            <input
                                type="number"
                                step="0.1"
                                min="35"
                                max="42"
                                placeholder={tempUnit}
                                value={formData.temperature}
                                onChange={(e) => setFormData({ ...formData, temperature: e.target.value })}
                                className="sick-day-temp-input"
                            />
                        </div>
                    </div>

                    <div className="symptom-chips-grid">
                        {COMMON_SYMPTOMS.map((symptom) => (
                            <button
                                key={symptom}
                                type="button"
                                className={`symptom-chip-btn ${formData.symptoms.includes(symptom) ? 'selected' : ''}`}
                                onClick={() => toggleSymptom(symptom)}
                            >
                                {symptomLabels[symptom]}
                            </button>
                        ))}
                    </div>

                    <textarea
                        placeholder={t('placeholder_additionalNotes')}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="sick-day-notes-input"
                        rows={2}
                    />

                    <div className="sick-day-form-actions">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? t('common:saving') : t('sickDays.logSickDay')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsAdding(false)}
                        >
                            {t('common:cancel')}
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    className="health-add-btn"
                    onClick={() => setIsAdding(true)}
                >
                    <Plus size={16} />
                    {t('sickDays.logSickDay')}
                </button>
            )}

            <ConfirmModal
                open={confirmDeleteId !== null}
                onConfirm={() => { handleDelete(confirmDeleteId!); setConfirmDeleteId(null); }}
                onCancel={() => setConfirmDeleteId(null)}
            />
        </div>
    );
}

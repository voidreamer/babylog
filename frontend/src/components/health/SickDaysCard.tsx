/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Thermometer, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { format, parseISO, isToday, isYesterday } from 'date-fns';
import { useTranslation } from 'react-i18next';

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

const symptomLabels: Record<string, string> = {
    fever: 'Fever',
    cough: 'Cough',
    runny_nose: 'Runny Nose',
    congestion: 'Congestion',
    vomiting: 'Vomiting',
    diarrhea: 'Diarrhea',
    rash: 'Rash',
    ear_pain: 'Ear Pain',
    fussy: 'Fussy',
    poor_appetite: 'Poor Appetite',
    lethargy: 'Lethargy',
    sore_throat: 'Sore Throat',
};

interface SickDaysCardProps { baby: any; sickDays: any[]; onSickDayAdded?: () => void; onSickDayDeleted?: () => void; }
export default function SickDaysCard({ baby, sickDays, onSickDayAdded, onSickDayDeleted }: SickDaysCardProps) {
    const { t } = useTranslation('health');
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
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
                date: new Date(formData.date).toISOString(),
                symptoms: formData.symptoms,
                temperature: formData.temperature ? parseFloat(formData.temperature) : null,
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
            toast.error('Failed to save: ' + (error as Error).message);
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
            toast.error('Failed to delete: ' + (error as Error).message);
        }
    };

    const formatSickDate = (dateStr: string): string => {
        try {
            const date = parseISO(dateStr);
            if (isToday(date)) return 'Today';
            if (isYesterday(date)) return 'Yesterday';
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
                    Sick Days
                </h3>
                {sickDays?.length > 0 && (
                    <span className="health-card-count">{sickDays.length} recorded</span>
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
                                        {parseFloat(day.temperature).toFixed(1)}°C
                                    </span>
                                )}
                                <button
                                    className="sick-day-delete"
                                    onClick={() => handleDelete(day.id)}
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
                <p className="health-card-empty">No sick days recorded - great!</p>
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
                                placeholder={t('placeholder_tempC')}
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
                            {saving ? 'Saving...' : 'Log Sick Day'}
                        </button>
                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => setIsAdding(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </form>
            ) : (
                <button
                    className="health-add-btn"
                    onClick={() => setIsAdding(true)}
                >
                    <Plus size={16} />
                    Log Sick Day
                </button>
            )}
        </div>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { AlertTriangle, Plus, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { api } from '../../api/client';
import { format, parseISO } from 'date-fns';
import { formatDate } from '../../utils/formatDate';
import { useTranslation } from 'react-i18next';

const COMMON_ALLERGENS = [
    'Dairy',
    'Eggs',
    'Peanuts',
    'Tree Nuts',
    'Soy',
    'Wheat',
    'Fish',
    'Shellfish',
    'Sesame',
];

const SEVERITY_LEVELS = [
    { value: 'mild', label: 'Mild', description: 'Minor symptoms, no treatment needed' },
    { value: 'moderate', label: 'Moderate', description: 'Noticeable symptoms, may need medication' },
    { value: 'severe', label: 'Severe', description: 'Serious reaction, needs immediate attention' },
];

interface AllergiesCardProps { baby: any; allergies: any[]; onAllergyAdded?: () => void; onAllergyDeleted?: () => void; }
export default function AllergiesCard({ baby, allergies, onAllergyAdded, onAllergyDeleted }: AllergiesCardProps) {
    const { t } = useTranslation('health');
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [formData, setFormData] = useState({
        allergen: '',
        severity: 'mild',
        reaction: '',
        discovered_date: new Date().toISOString().split('T')[0],
        notes: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.allergen.trim()) {
            toast.error(t('toast_pleaseEnterTheAllergen'));
            return;
        }

        setSaving(true);
        try {
            const data = {
                baby_id: baby.id,
                allergen: formData.allergen.trim(),
                severity: formData.severity,
                reaction: formData.reaction || null,
                discovered_date: formData.discovered_date
                    ? new Date(formData.discovered_date).toISOString()
                    : null,
                notes: formData.notes || null,
            };

            await api.createAllergy(data);
            toast.success(t('toast_allergyRecorded'));
            setFormData({
                allergen: '',
                severity: 'mild',
                reaction: '',
                discovered_date: new Date().toISOString().split('T')[0],
                notes: '',
            });
            setIsAdding(false);
            if (onAllergyAdded) onAllergyAdded();
        } catch (error) {
            toast.error('Failed to save: ' + (error as Error).message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await api.deleteAllergy(id);
            toast.success(t('toast_allergyRemoved'));
            if (onAllergyDeleted) onAllergyDeleted();
        } catch (error) {
            toast.error('Failed to delete: ' + (error as Error).message);
        }
    };

    const formatDate = (dateStr: string): string => {
        if (!dateStr) return '';
        try {
            return format(parseISO(dateStr), 'MMM yyyy');
        } catch {
            return dateStr;
        }
    };

    const getSeverityClass = (severity: string | null): string => {
        switch (severity) {
            case 'severe': return 'severity-severe';
            case 'moderate': return 'severity-moderate';
            default: return 'severity-mild';
        }
    };

    return (
        <div className="health-card allergies-card">
            <div className="health-card-header">
                <h3 className="health-card-title">
                    <AlertTriangle size={18} />
                    Allergies
                </h3>
                {allergies?.length > 0 && (
                    <span className="health-card-count">{allergies.length} known</span>
                )}
            </div>

            {/* Allergies List */}
            {allergies?.length > 0 ? (
                <div className="allergies-list">
                    {allergies.map((allergy) => (
                        <div key={allergy.id} className={`allergy-item ${getSeverityClass(allergy.severity)}`}>
                            <div className="allergy-header">
                                <span className="allergy-name">{allergy.allergen}</span>
                                <span className={`allergy-severity ${getSeverityClass(allergy.severity)}`}>
                                    {allergy.severity || 'Unknown'}
                                </span>
                                <button
                                    className="allergy-delete"
                                    onClick={() => handleDelete(allergy.id)}
                                    aria-label={t('arialabel_deleteAllergy')}
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                            {allergy.reaction && (
                                <p className="allergy-reaction">Reaction: {allergy.reaction}</p>
                            )}
                            {allergy.discovered_date && (
                                <p className="allergy-date">Discovered: {formatDate(allergy.discovered_date)}</p>
                            )}
                            {allergy.notes && (
                                <p className="allergy-notes">{allergy.notes}</p>
                            )}
                        </div>
                    ))}
                </div>
            ) : (
                <p className="health-card-empty">No known allergies</p>
            )}

            {/* Add Form */}
            {isAdding ? (
                <form onSubmit={handleSubmit} className="allergy-form">
                    <div className="allergy-form-main">
                        <input
                            type="text"
                            placeholder={t('placeholder_allergenEgPeanuts')}
                            value={formData.allergen}
                            onChange={(e) => setFormData({ ...formData, allergen: e.target.value })}
                            className="allergy-input"
                            autoFocus
                            list="common-allergens"
                        />
                        <datalist id="common-allergens">
                            {COMMON_ALLERGENS.map(a => (
                                <option key={a} value={a} />
                            ))}
                        </datalist>
                    </div>

                    <div className="severity-selector">
                        {SEVERITY_LEVELS.map((level) => (
                            <button
                                key={level.value}
                                type="button"
                                className={`severity-btn ${formData.severity === level.value ? 'selected' : ''} ${getSeverityClass(level.value)}`}
                                onClick={() => setFormData({ ...formData, severity: level.value })}
                            >
                                {level.label}
                            </button>
                        ))}
                    </div>

                    <input
                        type="text"
                        placeholder={t('placeholder_reactionEgHivesSwelling')}
                        value={formData.reaction}
                        onChange={(e) => setFormData({ ...formData, reaction: e.target.value })}
                        className="allergy-reaction-input"
                    />

                    <div className="allergy-form-row">
                        <label className="allergy-date-label">
                            Discovered:
                            <input
                                type="date"
                                value={formData.discovered_date}
                                onChange={(e) => setFormData({ ...formData, discovered_date: e.target.value })}
                                className="allergy-date-input"
                            />
                        </label>
                    </div>

                    <textarea
                        placeholder={t('placeholder_additionalNotes')}
                        value={formData.notes}
                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                        className="allergy-notes-input"
                        rows={2}
                    />

                    <div className="allergy-form-actions">
                        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                            {saving ? 'Saving...' : 'Add Allergy'}
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
                    Add Allergy
                </button>
            )}
        </div>
    );
}

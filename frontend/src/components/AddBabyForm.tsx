/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Scale, Ruler } from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Reusable baby form component used by both Onboarding wizard and BabySelector.
 * Collects: name, birth date, gender, weight, height
 * Can be used for both creating new babies and editing existing ones.
 */
interface AddBabyFormProps {
    onSubmit: (data: any) => void;
    onCancel?: () => void;
    saving?: boolean;
    submitLabel?: string;
    showCancel?: boolean;
    compact?: boolean;
    initialData?: any;
}

export default function AddBabyForm({
    onSubmit,
    onCancel,
    saving = false,
    submitLabel = 'Add Baby',
    showCancel = true,
    compact = false,
    initialData = null,
}: AddBabyFormProps) {
    const { t } = useTranslation('common');
    const [name, setName] = useState(initialData?.name || '');
    const [birthDate, setBirthDate] = useState(initialData?.birth_date ? initialData.birth_date.split('T')[0] : '');
    const [gender, setGender] = useState(initialData?.gender || '');
    const [birthWeight, setBirthWeight] = useState(initialData?.birth_weight || '');
    const [birthHeight, setBirthHeight] = useState(initialData?.birth_height || '');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;

        onSubmit({
            name: name.trim(),
            birthDate,
            gender: gender || null,
            birthWeight: birthWeight ? parseFloat(birthWeight) : null,
            birthHeight: birthHeight ? parseFloat(birthHeight) : null,
        });
    };

    return (
        <form onSubmit={handleSubmit} className={compact ? 'baby-form-compact' : ''}>
            <div className="form-group">
                <label className="form-label">{t('auth:addBaby.name')} *</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder={t('placeholder_enterName')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">{t('auth:addBaby.birthDate')} *</label>
                <input
                    type="date"
                    className="form-input"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">{t('auth:addBaby.gender')}</label>
                <div className="gender-selector">
                    <button
                        type="button"
                        className={`gender-btn ${gender === 'boy' ? 'active boy' : ''}`}
                        onClick={() => setGender(gender === 'boy' ? '' : 'boy')}
                    >
                        {t('auth:addBaby.genderBoy')}
                    </button>
                    <button
                        type="button"
                        className={`gender-btn ${gender === 'girl' ? 'active girl' : ''}`}
                        onClick={() => setGender(gender === 'girl' ? '' : 'girl')}
                    >
                        {t('auth:addBaby.genderGirl')}
                    </button>
                </div>
                <p className="form-hint">{t('addBabyForm.genderHint')}</p>
            </div>

            <div className="onboarding-section-label">
                <span>{t('addBabyForm.birthMeasurements')}</span>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">
                        <Scale size={14} /> {t('addBabyForm.weightKg')}
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder={t('placeholder_35')}
                        value={birthWeight}
                        onChange={(e) => setBirthWeight(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">
                        <Ruler size={14} /> {t('addBabyForm.heightCm')}
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        placeholder={t('placeholder_50')}
                        value={birthHeight}
                        onChange={(e) => setBirthHeight(e.target.value)}
                    />
                </div>
            </div>

            <div className={showCancel ? 'modal-footer' : 'form-actions'}>
                {showCancel && (
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={onCancel}
                    >
                        {t('cancel')}
                    </button>
                )}
                <button
                    type="submit"
                    className={`btn btn-primary ${!showCancel ? 'btn-lg' : ''}`}
                    disabled={saving || !name.trim()}
                >
                    {saving ? t('saving') : submitLabel}
                </button>
            </div>
        </form>
    );
}

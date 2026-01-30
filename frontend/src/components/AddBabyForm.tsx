/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from 'react';
import { Scale, Ruler } from 'lucide-react';

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
                <label className="form-label">Baby's Name *</label>
                <input
                    type="text"
                    className="form-input"
                    placeholder="Enter name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoFocus
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Birth Date *</label>
                <input
                    type="date"
                    className="form-input"
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label className="form-label">Gender</label>
                <div className="gender-selector">
                    <button
                        type="button"
                        className={`gender-btn ${gender === 'boy' ? 'active boy' : ''}`}
                        onClick={() => setGender(gender === 'boy' ? '' : 'boy')}
                    >
                        Boy
                    </button>
                    <button
                        type="button"
                        className={`gender-btn ${gender === 'girl' ? 'active girl' : ''}`}
                        onClick={() => setGender(gender === 'girl' ? '' : 'girl')}
                    >
                        Girl
                    </button>
                </div>
                <p className="form-hint">Optional - helps with accurate growth charts</p>
            </div>

            <div className="onboarding-section-label">
                <span>Birth Measurements (optional)</span>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label className="form-label">
                        <Scale size={14} /> Weight (kg)
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        className="form-input"
                        placeholder="3.5"
                        value={birthWeight}
                        onChange={(e) => setBirthWeight(e.target.value)}
                    />
                </div>
                <div className="form-group">
                    <label className="form-label">
                        <Ruler size={14} /> Height (cm)
                    </label>
                    <input
                        type="number"
                        step="0.1"
                        className="form-input"
                        placeholder="50"
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
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    className={`btn btn-primary ${!showCancel ? 'btn-lg' : ''}`}
                    disabled={saving || !name.trim()}
                >
                    {saving ? 'Saving...' : submitLabel}
                </button>
            </div>
        </form>
    );
}

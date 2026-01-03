import { useState } from 'react';
import { useBaby } from '../hooks/useBaby';
import { api } from '../api/client';
import { Baby, ArrowRight, Sparkles, Scale, Ruler } from 'lucide-react';
import { toast } from 'sonner';

export default function Onboarding({ onComplete }) {
    const { refresh } = useBaby();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);

    // Form state
    const [name, setName] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [gender, setGender] = useState('');
    const [birthWeight, setBirthWeight] = useState('');
    const [birthHeight, setBirthHeight] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error('Please enter baby\'s name');
            return;
        }

        setSaving(true);
        try {
            // Create baby
            const baby = await api.createBaby({
                name: name.trim(),
                birth_date: birthDate ? new Date(birthDate).toISOString() : null,
                gender: gender || null,
            });

            // If birth weight or height provided, create initial growth record
            if ((birthWeight || birthHeight) && baby?.id) {
                try {
                    await api.createGrowthRecord({
                        baby_id: baby.id,
                        recorded_date: birthDate ? new Date(birthDate).toISOString() : new Date().toISOString(),
                        weight_kg: birthWeight ? parseFloat(birthWeight) : null,
                        height_cm: birthHeight ? parseFloat(birthHeight) : null,
                        notes: 'Birth measurements',
                    });
                } catch (err) {
                    // Non-critical, just log
                    console.error('Failed to save birth measurements:', err);
                }
            }

            await refresh();
            setStep(3); // Success step
        } catch (error) {
            console.error('Failed to create baby:', error);
            toast.error('Failed to add baby');
        } finally {
            setSaving(false);
        }
    };

    // Step 1: Welcome
    if (step === 1) {
        return (
            <div className="onboarding-container">
                <div className="onboarding-card">
                    <div className="onboarding-icon">
                        <Baby size={48} />
                    </div>
                    <h1 className="onboarding-title">Welcome to SimpleBaby!</h1>
                    <p className="onboarding-subtitle">
                        Let's set up your baby's profile so you can start tracking.
                    </p>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setStep(2)}
                    >
                        Get Started <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    // Step 2: Add Baby Form
    if (step === 2) {
        return (
            <div className="onboarding-container">
                <div className="onboarding-card onboarding-form-card">
                    <h2 className="onboarding-form-title">Add Your Baby</h2>

                    <form onSubmit={handleSubmit}>
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
                                    👦 Boy
                                </button>
                                <button
                                    type="button"
                                    className={`gender-btn ${gender === 'girl' ? 'active girl' : ''}`}
                                    onClick={() => setGender(gender === 'girl' ? '' : 'girl')}
                                >
                                    👧 Girl
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

                        <button
                            type="submit"
                            className="btn btn-primary btn-lg"
                            disabled={saving}
                        >
                            {saving ? 'Saving...' : 'Add Baby'}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Step 3: Success
    if (step === 3) {
        return (
            <div className="onboarding-container">
                <div className="onboarding-card">
                    <div className="onboarding-icon success">
                        <Sparkles size={48} />
                    </div>
                    <h1 className="onboarding-title">All Set! 🎉</h1>
                    <p className="onboarding-subtitle">
                        {name}'s profile is ready. Start tracking now!
                    </p>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={onComplete}
                    >
                        Go to Dashboard <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

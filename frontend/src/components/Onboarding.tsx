/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useBaby } from '../hooks/useBaby';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import AddBabyForm from './AddBabyForm';
import { Baby, ArrowRight, Sparkles, LogOut, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

interface OnboardingProps { onComplete: () => void; }
export default function Onboarding({ onComplete }: OnboardingProps) {
    const { refresh } = useBaby();
    const { logout, user } = useAuth();
    const [step, setStep] = useState(1);
    const [saving, setSaving] = useState(false);
    const [babyName, setBabyName] = useState('');

    // Theme state
    const [selectedTheme, setSelectedTheme] = useState(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'handwritten') return 'light';
        if (stored === 'handwritten-dark' || stored === 'classic') return 'dark';
        return stored || 'light';
    });

    // Apply theme preview
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('theme', selectedTheme);
    }, [selectedTheme]);

    const handleBabySubmit = async (formData: any) => {
        setSaving(true);
        try {
            // Create baby
            const baby = await api.createBaby({
                name: formData.name,
                birth_date: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
                gender: formData.gender,
            });

            // If birth weight or height provided, create initial growth record
            if ((formData.birthWeight || formData.birthHeight) && baby?.id) {
                try {
                    await api.createGrowthRecord({
                        baby_id: baby.id,
                        recorded_date: formData.birthDate
                            ? new Date(formData.birthDate).toISOString()
                            : new Date().toISOString(),
                        weight_kg: formData.birthWeight,
                        height_cm: formData.birthHeight,
                        notes: 'Birth measurements',
                    });
                } catch (err) {
                    console.error('Failed to save birth measurements:', err);
                }
            }

            setBabyName(formData.name);
            await refresh();
            setStep(4); // Success step
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
                    <h1 className="onboarding-title">Welcome to HeyBub!</h1>
                    <p className="onboarding-subtitle">
                        Let's set up your baby's profile so you can start tracking.
                    </p>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setStep(2)}
                    >
                        Get Started <ArrowRight size={18} />
                    </button>

                    {/* Logout option */}
                    <div className="onboarding-footer">
                        {user?.email && (
                            <span className="onboarding-email">{user.email}</span>
                        )}
                        <button
                            className="btn-link"
                            onClick={logout}
                            style={{ marginTop: 'var(--space-md)' }}
                        >
                            <LogOut size={14} /> Sign out
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Step 2: Choose Theme
    if (step === 2) {
        return (
            <div className="onboarding-container">
                <div className="onboarding-card onboarding-theme-card">
                    <div className="onboarding-icon">
                        <Moon size={48} />
                    </div>
                    <h2 className="onboarding-title">Choose Your Style</h2>
                    <p className="onboarding-subtitle">
                        Pick the look that feels right for you.
                    </p>

                    <div className="theme-selector">
                        <button
                            className={`theme-option ${selectedTheme === 'light' ? 'active' : ''}`}
                            onClick={() => setSelectedTheme('light')}
                        >
                            <div className="theme-preview" style={{ background: '#fefdfb' }}>
                                <Sun size={24} />
                            </div>
                            <span className="theme-name">Light</span>
                            <span className="theme-desc">Warm and bright</span>
                        </button>

                        <button
                            className={`theme-option ${selectedTheme === 'dark' ? 'active' : ''}`}
                            onClick={() => setSelectedTheme('dark')}
                        >
                            <div className="theme-preview" style={{ background: '#1a1614' }}>
                                <Moon size={24} color="#f0e8e4" />
                            </div>
                            <span className="theme-name">Dark</span>
                            <span className="theme-desc">Easy on the eyes</span>
                        </button>
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setStep(3)}
                    >
                        Continue <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    // Step 3: Add Baby Form
    if (step === 3) {
        return (
            <div className="onboarding-container">
                <div className="onboarding-card onboarding-form-card">
                    <h2 className="onboarding-form-title">Add Your Baby</h2>
                    <AddBabyForm
                        onSubmit={handleBabySubmit}
                        saving={saving}
                        submitLabel="Add Baby"
                        showCancel={false}
                    />
                </div>
            </div>
        );
    }

    // Step 4: Success
    if (step === 4) {
        return (
            <div className="onboarding-container">
                <div className="onboarding-card">
                    <div className="onboarding-icon success">
                        <Sparkles size={48} />
                    </div>
                    <h1 className="onboarding-title">All Set!</h1>
                    <p className="onboarding-subtitle">
                        {babyName}'s profile is ready. Start tracking now!
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

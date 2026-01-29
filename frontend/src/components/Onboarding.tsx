/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useBaby } from '../hooks/useBaby';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import AddBabyForm from './AddBabyForm';
import { Baby, ArrowRight, Sparkles, LogOut, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

interface OnboardingProps { onComplete: () => void; }
export default function Onboarding({ onComplete }: OnboardingProps) {
    const { refresh } = useBaby();
    const { t } = useTranslation(['onboarding', 'common']);
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
            toast.error(t('common:errors.failedToSave'));
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
                    <h1 className="onboarding-title">{t('onboarding:welcome')}</h1>
                    <p className="onboarding-subtitle">
                        {t('onboarding:setupSubtitle')}
                    </p>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setStep(2)}
                    >
                        {t('onboarding:getStarted')} <ArrowRight size={18} />
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
                            <LogOut size={14} /> {t('onboarding:signOut')}
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
                    <h2 className="onboarding-title">{t('onboarding:chooseStyle')}</h2>
                    <p className="onboarding-subtitle">
                        {t('onboarding:pickLook')}
                    </p>

                    <div className="theme-selector">
                        <button
                            className={`theme-option ${selectedTheme === 'light' ? 'active' : ''}`}
                            onClick={() => setSelectedTheme('light')}
                        >
                            <div className="theme-preview" style={{ background: '#fefdfb' }}>
                                <Sun size={24} />
                            </div>
                            <span className="theme-name">{t('onboarding:light')}</span>
                            <span className="theme-desc">{t('onboarding:lightDesc')}</span>
                        </button>

                        <button
                            className={`theme-option ${selectedTheme === 'dark' ? 'active' : ''}`}
                            onClick={() => setSelectedTheme('dark')}
                        >
                            <div className="theme-preview" style={{ background: '#1a1614' }}>
                                <Moon size={24} color="#f0e8e4" />
                            </div>
                            <span className="theme-name">{t('onboarding:dark')}</span>
                            <span className="theme-desc">{t('onboarding:darkDesc')}</span>
                        </button>
                    </div>

                    <button
                        className="btn btn-primary btn-lg"
                        onClick={() => setStep(3)}
                    >
                        {t('onboarding:continue')} <ArrowRight size={18} />
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
                    <h2 className="onboarding-form-title">{t('onboarding:addYourBaby')}</h2>
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
                    <h1 className="onboarding-title">{t('onboarding:allSet')}</h1>
                    <p className="onboarding-subtitle">
                        {t('onboarding:profileReady', { name: babyName })}
                    </p>
                    <button
                        className="btn btn-primary btn-lg"
                        onClick={onComplete}
                    >
                        {t('onboarding:goToDashboard')} <ArrowRight size={18} />
                    </button>
                </div>
            </div>
        );
    }

    return null;
}

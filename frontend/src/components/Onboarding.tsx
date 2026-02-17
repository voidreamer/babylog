/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from 'react';
import { useBaby } from '../hooks/useBaby';
import { useAuth } from '../hooks/useAuth';
import { api } from '../api/client';
import AddBabyForm from './AddBabyForm';
import { ArrowRight, ArrowLeft, LogOut, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { LANGUAGES } from '../i18n/languages';
import { motion, AnimatePresence } from 'framer-motion';

const TOTAL_STEPS = 6;

const FEATURE_PILLS = [
    { icon: '/icons/feeding.png', key: 'feedings' },
    { icon: '/icons/sleep.png', key: 'sleep' },
    { icon: '/icons/diaper.png', key: 'diapers' },
    { icon: '/icons/growth.png', key: 'growth' },
];

interface OnboardingProps { onComplete: () => void; }

export default function Onboarding({ onComplete }: OnboardingProps) {
    const { t, i18n } = useTranslation(['auth', 'common']);
    const { refresh } = useBaby();
    const { logout, user } = useAuth();
    const [step, setStep] = useState(1);
    const [direction, setDirection] = useState(1); // 1=forward, -1=back
    const [saving, setSaving] = useState(false);
    const [babyName, setBabyName] = useState('');

    // Language state — auto-detect from browser
    const [selectedLanguage, setSelectedLanguage] = useState(() => {
        const stored = localStorage.getItem('language');
        if (stored) return stored;
        const browserLang = navigator.language;
        const match = LANGUAGES.find(l => browserLang.startsWith(l.code.split('-')[0]));
        return match?.code || 'en';
    });

    // Theme state
    const [selectedTheme, setSelectedTheme] = useState(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'handwritten') return 'light';
        if (stored === 'handwritten-dark' || stored === 'classic') return 'dark';
        return stored || 'light';
    });

    // Units state
    const [selectedUnits, setSelectedUnits] = useState(() => {
        return localStorage.getItem('heybub-units') || 'metric';
    });

    // Apply theme preview
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', selectedTheme);
        localStorage.setItem('theme', selectedTheme);
    }, [selectedTheme]);

    // Apply language immediately
    useEffect(() => {
        i18n.changeLanguage(selectedLanguage);
        localStorage.setItem('language', selectedLanguage);
    }, [selectedLanguage, i18n]);

    // Apply units
    useEffect(() => {
        localStorage.setItem('heybub-units', selectedUnits);
    }, [selectedUnits]);

    const goTo = (nextStep: number) => {
        setDirection(nextStep > step ? 1 : -1);
        setStep(nextStep);
    };

    const handleBabySubmit = async (formData: any) => {
        setSaving(true);
        try {
            const baby = await api.createBaby({
                name: formData.name,
                birth_date: formData.birthDate ? new Date(formData.birthDate).toISOString() : null,
                gender: formData.gender,
            });

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
            goTo(6);
        } catch (error) {
            console.error('Failed to create baby:', error);
            toast.error(t('common:toast_failedToAddBaby'));
        } finally {
            setSaving(false);
        }
    };

    const handleFinish = async () => {
        try { await api.completeOnboarding(); } catch { /* fire-and-forget */ }
        localStorage.setItem('heybub-onboarding-completed', 'true');
        onComplete();
    };

    const slideVariants = {
        enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
    };

    const renderProgressDots = () => (
        <div className="onboarding-progress">
            {Array.from({ length: TOTAL_STEPS }, (_, i) => (
                <div
                    key={i}
                    className={`progress-dot ${i + 1 === step ? 'active' : ''} ${i + 1 < step ? 'completed' : ''}`}
                />
            ))}
        </div>
    );

    const renderBackButton = () => (
        step > 1 && step < 6 && (
            <button className="onboarding-back" onClick={() => goTo(step - 1)}>
                <ArrowLeft size={20} />
            </button>
        )
    );

    const renderStep = () => {
        switch (step) {
            // Step 1: Welcome
            case 1:
                return (
                    <div className="onboarding-card">
                        <img src="/icons/loading.png" alt="" className="onboarding-brand-icon" />
                        <h1 className="onboarding-brand-title">{t('common:appName')}</h1>
                        <p className="onboarding-subtitle">
                            {t('auth:onboarding.welcomeTagline', { defaultValue: t('auth:login.tagline') })}
                        </p>
                        <div className="onboarding-feature-pills">
                            {FEATURE_PILLS.map((pill) => (
                                <div key={pill.key} className="onboarding-feature-pill">
                                    <img src={pill.icon} alt="" className="onboarding-feature-pill-icon" />
                                    <span>{t(`auth:login.features.${pill.key}`)}</span>
                                </div>
                            ))}
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={() => goTo(2)}>
                            {t('auth:onboarding.getStarted')} <ArrowRight size={18} />
                        </button>
                        <div className="onboarding-footer">
                            {user?.email && <span className="onboarding-email">{user.email}</span>}
                            <button className="btn-link" onClick={logout} style={{ marginTop: 'var(--space-md)' }}>
                                <LogOut size={14} /> {t('auth:onboarding.signOut')}
                            </button>
                        </div>
                    </div>
                );

            // Step 2: Language
            case 2:
                return (
                    <div className="onboarding-card">
                        <h2 className="onboarding-title">{t('auth:onboarding.chooseLanguage', { defaultValue: 'Choose Language' })}</h2>
                        <p className="onboarding-subtitle">
                            {t('auth:onboarding.chooseLanguageSubtitle', { defaultValue: 'Select your preferred language.' })}
                        </p>
                        <div className="language-grid">
                            {LANGUAGES.map((lang) => (
                                <button
                                    key={lang.code}
                                    className={`language-option ${selectedLanguage === lang.code ? 'active' : ''}`}
                                    onClick={() => setSelectedLanguage(lang.code)}
                                >
                                    <span className="language-flag">{lang.flag}</span>
                                    <span className="language-name">{lang.nativeName}</span>
                                </button>
                            ))}
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={() => goTo(3)}>
                            {t('auth:onboarding.continue')} <ArrowRight size={18} />
                        </button>
                    </div>
                );

            // Step 3: Theme
            case 3:
                return (
                    <div className="onboarding-card">
                        <h2 className="onboarding-title">{t('auth:onboarding.chooseStyle')}</h2>
                        <p className="onboarding-subtitle">{t('auth:onboarding.chooseStyleSubtitle')}</p>
                        <div className="theme-selector">
                            <button
                                className={`theme-option ${selectedTheme === 'light' ? 'active' : ''}`}
                                onClick={() => setSelectedTheme('light')}
                            >
                                <div className="theme-preview" style={{ background: '#fefdfb' }}>
                                    <Sun size={24} />
                                </div>
                                <span className="theme-name">{t('auth:onboarding.lightTheme')}</span>
                                <span className="theme-desc">{t('auth:onboarding.lightThemeDesc')}</span>
                            </button>
                            <button
                                className={`theme-option ${selectedTheme === 'dark' ? 'active' : ''}`}
                                onClick={() => setSelectedTheme('dark')}
                            >
                                <div className="theme-preview" style={{ background: '#1a1614' }}>
                                    <Moon size={24} color="#f0e8e4" />
                                </div>
                                <span className="theme-name">{t('auth:onboarding.darkTheme')}</span>
                                <span className="theme-desc">{t('auth:onboarding.darkThemeDesc')}</span>
                            </button>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={() => goTo(4)}>
                            {t('auth:onboarding.continue')} <ArrowRight size={18} />
                        </button>
                    </div>
                );

            // Step 4: Units
            case 4:
                return (
                    <div className="onboarding-card">
                        <h2 className="onboarding-title">{t('auth:onboarding.chooseUnits', { defaultValue: 'Measurement Units' })}</h2>
                        <p className="onboarding-subtitle">
                            {t('auth:onboarding.chooseUnitsSubtitle', { defaultValue: 'Choose your preferred units.' })}
                        </p>
                        <div className="units-selector">
                            <button
                                className={`units-option ${selectedUnits === 'metric' ? 'active' : ''}`}
                                onClick={() => setSelectedUnits('metric')}
                            >
                                <span className="units-label">{t('auth:onboarding.metric', { defaultValue: 'Metric' })}</span>
                                <span className="units-values">{t('auth:onboarding.metricValues', { defaultValue: 'kg, cm, ml' })}</span>
                            </button>
                            <button
                                className={`units-option ${selectedUnits === 'imperial' ? 'active' : ''}`}
                                onClick={() => setSelectedUnits('imperial')}
                            >
                                <span className="units-label">{t('auth:onboarding.imperial', { defaultValue: 'Imperial' })}</span>
                                <span className="units-values">{t('auth:onboarding.imperialValues', { defaultValue: 'lbs, in, oz' })}</span>
                            </button>
                        </div>
                        <button className="btn btn-primary btn-lg" onClick={() => goTo(5)}>
                            {t('auth:onboarding.continue')} <ArrowRight size={18} />
                        </button>
                    </div>
                );

            // Step 5: Add Baby
            case 5:
                return (
                    <div className="onboarding-card onboarding-form-card">
                        <h2 className="onboarding-form-title">{t('auth:onboarding.addYourBaby')}</h2>
                        <AddBabyForm
                            onSubmit={handleBabySubmit}
                            saving={saving}
                            submitLabel={t('common:submitLabel_addBaby')}
                            showCancel={false}
                        />
                    </div>
                );

            // Step 6: All Set
            case 6:
                return (
                    <div className="onboarding-card">
                        <img src="/icons/loading.png" alt="" className="onboarding-brand-icon" />
                        <h1 className="onboarding-title">{t('auth:onboarding.allSet')}</h1>
                        <p className="onboarding-subtitle">
                            {t('auth:onboarding.profileReady', { name: babyName })}
                        </p>
                        <button className="btn btn-primary btn-lg" onClick={handleFinish}>
                            {t('auth:onboarding.startExploring', { defaultValue: 'Start Exploring' })} <ArrowRight size={18} />
                        </button>
                    </div>
                );

            default:
                return null;
        }
    };

    return (
        <div className="onboarding-container">
            {renderBackButton()}
            {renderProgressDots()}
            <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                    key={step}
                    custom={direction}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                >
                    {renderStep()}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

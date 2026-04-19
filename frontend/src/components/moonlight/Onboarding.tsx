/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { useBaby } from '../../hooks/useBaby';
import { useAuth } from '../../hooks/useAuth';
import { api } from '../../api/client';
import { LANGUAGES } from '../../i18n/languages';
import AddBabyForm from '../AddBabyForm';
import { Orb } from './Orb';
import { BabyFace } from './BabyFace';
import { Icon } from './Icon';

type MoonlightOnboardingProps = {
  onComplete: () => void;
};

const TOTAL = 6;

/**
 * Moonlight-skinned first-run flow. Mirrors the 6 data-collection steps of
 * the production Onboarding component (welcome → language → style → units →
 * add baby → done) with moonlight typography, orb presence, and a calmer
 * narrative voice. Reuses AddBabyForm for step 5 to avoid reimplementing the
 * form validation.
 */
export default function MoonlightOnboarding({ onComplete }: MoonlightOnboardingProps) {
  const { t, i18n } = useTranslation(['auth', 'common']);
  const { refresh } = useBaby();
  const { logout, user } = useAuth();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [babyName, setBabyName] = useState('');

  const [selectedLanguage, setSelectedLanguage] = useState(() => {
    const stored = localStorage.getItem('language');
    if (stored) return stored;
    const browserLang = navigator.language;
    const match = LANGUAGES.find((l) => browserLang.startsWith(l.code.split('-')[0]));
    return match?.code || 'en';
  });

  const [selectedTheme, setSelectedTheme] = useState(() => {
    const stored = localStorage.getItem('theme');
    if (stored === 'handwritten') return 'light';
    if (stored === 'handwritten-dark' || stored === 'classic') return 'dark';
    return stored || 'light';
  });

  const [selectedUnits, setSelectedUnits] = useState(
    () => localStorage.getItem('heybub-units') || 'metric',
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', selectedTheme);
    localStorage.setItem('theme', selectedTheme);
  }, [selectedTheme]);

  useEffect(() => {
    i18n.changeLanguage(selectedLanguage);
    localStorage.setItem('language', selectedLanguage);
  }, [selectedLanguage, i18n]);

  useEffect(() => {
    localStorage.setItem('heybub-units', selectedUnits);
  }, [selectedUnits]);

  const next = () => setStep((s) => Math.min(TOTAL, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

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
      setStep(6);
    } catch (error) {
      console.error('Failed to create baby:', error);
      toast.error(t('common:toast_failedToAddBaby'));
    } finally {
      setSaving(false);
    }
  };

  const handleFinish = async () => {
    try {
      await api.completeOnboarding();
    } catch {
      /* fire-and-forget */
    }
    localStorage.setItem('heybub-onboarding-completed', 'true');
    onComplete();
  };

  const Heading = ({ children }: { children: React.ReactNode }) => (
    <h1
      style={{
        fontFamily: 'Geist Variable, Geist, -apple-system, sans-serif',
        fontWeight: 300,
        fontSize: 40,
        margin: 0,
        lineHeight: 1.05,
        color: 'var(--ml-text)',
        letterSpacing: -1,
      }}
    >
      {children}
    </h1>
  );

  const Emphasis = ({ children }: { children: React.ReactNode }) => (
    <em className="serif" style={{ color: 'var(--ml-accent)', fontStyle: 'italic' }}>
      {children}
    </em>
  );

  const OptionButton = ({
    active,
    onClick,
    children,
  }: {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) => (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: '100%',
        padding: '16px 18px',
        borderRadius: 18,
        background: active ? 'var(--ml-accent)' : 'var(--ml-surface)',
        color: active ? '#0a0706' : 'var(--ml-text)',
        border: `0.5px solid ${active ? 'var(--ml-accent)' : 'var(--ml-line)'}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 16,
        fontWeight: 500,
        textAlign: 'left',
      }}
    >
      {children}
      {active && <Icon.Check />}
    </button>
  );

  return (
    <div
      className="ml-onboarding"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        padding: 'env(safe-area-inset-top) 0 env(safe-area-inset-bottom)',
      }}
    >
      {/* Progress bar */}
      <div
        style={{
          padding: '24px 28px 0',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <div className="mono" style={{ color: 'var(--ml-accent)' }}>
          {String(step).padStart(2, '0')}/{String(TOTAL).padStart(2, '0')}
        </div>
        <div
          style={{
            flex: 1,
            height: 2,
            background: 'var(--ml-surface-2)',
            borderRadius: 2,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: `${(step / TOTAL) * 100}%`,
              height: '100%',
              background: 'var(--ml-accent)',
              borderRadius: 2,
              transition: 'width 0.4s',
            }}
          />
        </div>
      </div>

      {/* Step body */}
      <div
        style={{
          flex: 1,
          padding: '40px 28px 0',
          maxWidth: 520,
          margin: '0 auto',
          width: '100%',
        }}
      >
        {step === 1 && (
          <>
            <div className="mono" style={{ color: 'var(--ml-accent)', marginBottom: 20 }}>
              {t('auth:onboarding.welcomeTagline', { defaultValue: 'welcome, caregiver' })}
            </div>
            <Heading>
              {t('auth:onboarding.heyLetsMeet', { defaultValue: 'Hey. Let' })}
              <br />
              <Emphasis>
                {t('auth:onboarding.meetWord', { defaultValue: 'meet' })}
              </Emphasis>{' '}
              {t('auth:onboarding.yourBub', { defaultValue: 'your bub.' })}
            </Heading>
            <p
              className="serif italic"
              style={{
                fontSize: 17,
                lineHeight: 1.4,
                color: 'var(--ml-text-2)',
                marginTop: 24,
                maxWidth: 320,
              }}
            >
              {t('auth:onboarding.quietIntro', {
                defaultValue:
                  "A few quiet questions. We'll remember everything so you don't have to.",
              })}
            </p>
            <div style={{ marginTop: 40, textAlign: 'center' }}>
              <Orb
                size={150}
                mode="calm"
                iconNode={
                  <div style={{ color: '#2a1f1a', width: '100%', height: '100%' }}>
                    <BabyFace mood="calm" />
                  </div>
                }
                iconScale={0.5}
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="mono" style={{ color: 'var(--ml-accent)', marginBottom: 20 }}>
              01 · {t('auth:onboarding.chooseLanguage', { defaultValue: 'the language' })}
            </div>
            <Heading>{t('auth:onboarding.chooseLanguage')}</Heading>
            <div
              style={{
                marginTop: 28,
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              {LANGUAGES.map((lang) => (
                <OptionButton
                  key={lang.code}
                  active={selectedLanguage === lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                >
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 20 }}>{lang.flag}</span>
                    <span>{lang.nativeName}</span>
                  </span>
                </OptionButton>
              ))}
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="mono" style={{ color: 'var(--ml-accent)', marginBottom: 20 }}>
              02 · {t('auth:onboarding.chooseStyle')}
            </div>
            <Heading>
              {t('auth:onboarding.chooseStyle')}
            </Heading>
            <p
              className="serif italic"
              style={{ fontSize: 16, color: 'var(--ml-text-2)', marginTop: 14 }}
            >
              {t('auth:onboarding.chooseStyleSubtitle')}
            </p>
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <OptionButton
                active={selectedTheme === 'light'}
                onClick={() => setSelectedTheme('light')}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{t('auth:onboarding.lightTheme')}</span>
                  <span style={{ fontSize: 12, opacity: 0.65 }}>
                    {t('auth:onboarding.lightThemeDesc')}
                  </span>
                </span>
              </OptionButton>
              <OptionButton
                active={selectedTheme === 'dark'}
                onClick={() => setSelectedTheme('dark')}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{t('auth:onboarding.darkTheme')}</span>
                  <span style={{ fontSize: 12, opacity: 0.65 }}>
                    {t('auth:onboarding.darkThemeDesc')}
                  </span>
                </span>
              </OptionButton>
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="mono" style={{ color: 'var(--ml-accent)', marginBottom: 20 }}>
              03 · {t('auth:onboarding.chooseUnits', { defaultValue: 'units' })}
            </div>
            <Heading>
              {t('auth:onboarding.chooseUnits', { defaultValue: 'Measurement units' })}
            </Heading>
            <p
              className="serif italic"
              style={{ fontSize: 16, color: 'var(--ml-text-2)', marginTop: 14 }}
            >
              {t('auth:onboarding.chooseUnitsSubtitle', {
                defaultValue: 'Choose your preferred units.',
              })}
            </p>
            <div style={{ marginTop: 28, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <OptionButton
                active={selectedUnits === 'metric'}
                onClick={() => setSelectedUnits('metric')}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{t('auth:onboarding.metric', { defaultValue: 'Metric' })}</span>
                  <span style={{ fontSize: 12, opacity: 0.65 }}>
                    {t('auth:onboarding.metricValues', { defaultValue: 'kg, cm, ml' })}
                  </span>
                </span>
              </OptionButton>
              <OptionButton
                active={selectedUnits === 'imperial'}
                onClick={() => setSelectedUnits('imperial')}
              >
                <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span>{t('auth:onboarding.imperial', { defaultValue: 'Imperial' })}</span>
                  <span style={{ fontSize: 12, opacity: 0.65 }}>
                    {t('auth:onboarding.imperialValues', { defaultValue: 'lbs, in, oz' })}
                  </span>
                </span>
              </OptionButton>
            </div>
          </>
        )}

        {step === 5 && (
          <>
            <div className="mono" style={{ color: 'var(--ml-accent)', marginBottom: 20 }}>
              04 · {t('auth:onboarding.addYourBaby', { defaultValue: 'the name' })}
            </div>
            <Heading>
              {t('auth:onboarding.addYourBaby', { defaultValue: 'Add your baby' })}
            </Heading>
            <div style={{ marginTop: 20 }}>
              <AddBabyForm
                onSubmit={handleBabySubmit}
                saving={saving}
                submitLabel={t('common:submitLabel_addBaby')}
                showCancel={false}
              />
            </div>
          </>
        )}

        {step === 6 && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center',
              paddingTop: 16,
            }}
          >
            <Orb
              size={170}
              mode="calm"
              iconNode={
                <div style={{ color: '#2a1f1a', width: '100%', height: '100%' }}>
                  <BabyFace mood="content" />
                </div>
              }
              iconScale={0.5}
            />
            <Heading>
              <span style={{ fontSize: 36, display: 'inline-block', marginTop: 28 }}>
                {t('auth:onboarding.meetWord', { defaultValue: 'Meet' })}{' '}
                <Emphasis>{babyName || '…'}</Emphasis>.
              </span>
            </Heading>
            <p
              className="serif italic"
              style={{
                fontSize: 16,
                lineHeight: 1.4,
                color: 'var(--ml-text-2)',
                maxWidth: 300,
                marginTop: 14,
              }}
            >
              {t('auth:onboarding.profileReady', { name: babyName || '' })}
            </p>
          </div>
        )}
      </div>

      {/* Footer navigation — form step owns its own submit */}
      {step !== 5 && (
        <div
          style={{
            padding: '20px 28px 28px',
            display: 'flex',
            gap: 10,
            maxWidth: 520,
            margin: '0 auto',
            width: '100%',
          }}
        >
          {step > 1 && step !== 6 && (
            <button
              type="button"
              onClick={prev}
              aria-label={t('auth:onboarding.back', { defaultValue: 'Back' })}
              style={{
                width: 58,
                height: 58,
                borderRadius: 999,
                background: 'var(--ml-surface)',
                border: '0.5px solid var(--ml-line)',
                color: 'var(--ml-text)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'inherit',
              }}
            >
              <Icon.Back />
            </button>
          )}
          <button
            type="button"
            onClick={step === 6 ? handleFinish : next}
            style={{
              flex: 1,
              height: 58,
              borderRadius: 999,
              background: 'var(--ml-accent)',
              color: '#0a0706',
              border: 'none',
              fontSize: 16,
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontFamily: 'inherit',
            }}
          >
            {step === 6
              ? t('auth:onboarding.startExploring', { defaultValue: 'Start exploring' })
              : step === 1
                ? t('auth:onboarding.getStarted')
                : t('auth:onboarding.continue')}
            <Icon.Arrow />
          </button>
        </div>
      )}

      {/* Footer: sign-out / email on step 1 only (matches production) */}
      {step === 1 && (
        <div
          style={{
            textAlign: 'center',
            padding: '4px 0 16px',
            fontSize: 12,
            color: 'var(--ml-text-3)',
          }}
        >
          {user?.email && <div style={{ marginBottom: 6 }}>{user.email}</div>}
          <button
            type="button"
            onClick={logout}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--ml-text-3)',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {t('auth:onboarding.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

import { useState } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBaby } from '../hooks/useBaby';

const TIP_KEYS = [
    'tip_sleep_1', 'tip_sleep_2', 'tip_sleep_3', 'tip_sleep_4', 'tip_sleep_5', 'tip_sleep_6', 'tip_sleep_7',
    'tip_feeding_1', 'tip_feeding_2', 'tip_feeding_3', 'tip_feeding_4', 'tip_feeding_5', 'tip_feeding_6', 'tip_feeding_7',
    'tip_dev_1', 'tip_dev_2', 'tip_dev_3', 'tip_dev_4', 'tip_dev_5', 'tip_dev_6', 'tip_dev_7', 'tip_dev_8',
    'tip_safety_1', 'tip_safety_2', 'tip_safety_3', 'tip_safety_4', 'tip_safety_5', 'tip_safety_6',
    'tip_selfcare_1', 'tip_selfcare_2', 'tip_selfcare_3', 'tip_selfcare_4', 'tip_selfcare_5', 'tip_selfcare_6', 'tip_selfcare_7',
];

const CATEGORIES: Record<string, string> = {
    sleep: 'catSleep',
    feeding: 'catFeeding',
    dev: 'catDevelopment',
    safety: 'catSafety',
    selfcare: 'catSelfCare',
};

function getAgeMonths(birthDate: string | null): number {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

function getDayOfYear(): number {
    const now = new Date();
    const start = new Date(now.getFullYear(), 0, 0);
    return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

export default function TipOfTheDay() {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();
    const ageMonths = getAgeMonths(selectedBaby?.birth_date ?? null);

    const todayKey = `tip_dismissed_${getDayOfYear()}`;
    const [dismissed, setDismissed] = useState(() => localStorage.getItem(todayKey) === '1');

    if (dismissed) return null;

    const tipIndex = getDayOfYear() % TIP_KEYS.length;
    const tipKey = TIP_KEYS[tipIndex];
    const tipText = t(`tipOfTheDay.tips.${tipKey}`);

    // Extract category from key (e.g. "tip_sleep_1" -> "sleep")
    const parts = tipKey.split('_');
    const catKey = parts[1];
    const categoryLabel = t(`tipOfTheDay.${CATEGORIES[catKey] || 'catGeneral'}`);

    const ageLabel = ageMonths > 0 ? t('tipOfTheDay.ageContext', { months: ageMonths }) : '';

    return (
        <div className="tip-of-the-day" style={{
            background: 'var(--surface, #fff)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: '12px',
            padding: '14px 16px',
            margin: '12px 0',
            display: 'flex',
            gap: '12px',
            alignItems: 'flex-start',
            position: 'relative',
        }}>
            <div style={{
                background: 'linear-gradient(135deg, #FFF3CD, #FFE69C)',
                borderRadius: '10px',
                padding: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
            }}>
                <Lightbulb size={20} color="#856404" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        {t('tipOfTheDay.title')} · {categoryLabel}
                    </span>
                </div>
                <p style={{ margin: 0, fontSize: '13px', lineHeight: 1.5, color: 'var(--text, #333)' }}>
                    {tipText}
                </p>
                {ageLabel && (
                    <span style={{ fontSize: '11px', opacity: 0.4, marginTop: '4px', display: 'block' }}>{ageLabel}</span>
                )}
            </div>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    localStorage.setItem(todayKey, '1');
                    setDismissed(true);
                }}
                onTouchEnd={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    localStorage.setItem(todayKey, '1');
                    setDismissed(true);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '8px',
                    opacity: 0.4,
                    flexShrink: 0,
                    minWidth: '32px',
                    minHeight: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
                aria-label="Dismiss"
            >
                <X size={16} />
            </button>
        </div>
    );
}

import { useState, useMemo } from 'react';
import { Lightbulb, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useBaby } from '../hooks/useBaby';

const TIP_COUNT = 40;

function getAgeMonths(birthDate: string | null): number {
    if (!birthDate) return 0;
    const birth = new Date(birthDate);
    const now = new Date();
    return (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth());
}

/** Get the day-of-year number for tip rotation */
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

    // Pick age-appropriate tip index, rotating daily
    const tipIndex = useMemo(() => {
        // Filter tips by age suitability using index ranges
        // 0-9: newborn/general, 10-19: sleep, 20-29: feeding, 30-34: development, 35-39: parent self-care
        const day = getDayOfYear();
        return day % TIP_COUNT;
    }, []);

    const tipKey = `tips.tip${tipIndex}`;
    const tipText = t(tipKey);

    // Determine category label
    const categoryKey = tipIndex < 10 ? 'tips.catGeneral' :
        tipIndex < 20 ? 'tips.catSleep' :
        tipIndex < 30 ? 'tips.catFeeding' :
        tipIndex < 35 ? 'tips.catDevelopment' :
        'tips.catSelfCare';

    if (dismissed) return null;

    // Add age context if available
    const ageLabel = ageMonths > 0 ? t('tips.ageContext', { months: ageMonths }) : '';

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
                        {t('tips.title')} · {t(categoryKey)}
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
                onClick={() => {
                    localStorage.setItem(todayKey, '1');
                    setDismissed(true);
                }}
                style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '4px',
                    opacity: 0.4,
                    flexShrink: 0,
                }}
                aria-label="Dismiss"
            >
                <X size={16} />
            </button>
        </div>
    );
}

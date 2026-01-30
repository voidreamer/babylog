/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useBaby } from '../hooks/useBaby';
import BabyInsights from './BabyInsights';

function calculateAgeInMonths(birthDate: string): number {
    const birth = new Date(birthDate);
    const today = new Date();
    const months = (today.getFullYear() - birth.getFullYear()) * 12 +
        (today.getMonth() - birth.getMonth());
    return Math.max(0, months);
}
import { TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface LearnProps { isPremium?: boolean; }
export default function Learn({ isPremium = false }: LearnProps) {
    const { selectedBaby } = useBaby();
    const { t } = useTranslation('health');

    const babyAgeMonths = useMemo(() => {
        if (!selectedBaby?.birth_date) return null;
        return calculateAgeInMonths(selectedBaby.birth_date);
    }, [selectedBaby]);

    return (
        <div className="learn-page">
            <motion.div
                className="learn-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="learn-header">
                    <h1 className="learn-title">
                        <TrendingUp size={24} /> {t('insights.title')}
                    </h1>
                    {selectedBaby && babyAgeMonths !== null && (
                        <p className="learn-subtitle">
                            <Sparkles size={14} /> {t('insights.forBaby', { name: selectedBaby.name, age: babyAgeMonths, ageUnit: t('insights.month', { count: babyAgeMonths }) })}
                        </p>
                    )}
                </div>

                <BabyInsights isPremium={isPremium} />
            </motion.div>
        </div>
    );
}

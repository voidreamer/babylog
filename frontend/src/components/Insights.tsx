/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useBaby } from '../hooks/useBaby';
import BabyInsights from './BabyInsights';
import { calculatePreciseAge } from '../utils/ageUtils';
import { TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface InsightsProps { isPremium?: boolean; }
export default function Insights({ isPremium = false }: InsightsProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();

    const ageLabel = useMemo(() => {
        if (!selectedBaby?.birth_date) return null;
        const age = calculatePreciseAge(selectedBaby.birth_date);
        if (age.days < 0) return null;
        if (age.days === 0) return t('age.bornToday');
        if (age.days < 7) return t(age.days === 1 ? 'age.daysOld' : 'age.daysOld_plural', { count: age.days });
        if (age.weeks < 12) return t(age.weeks === 1 ? 'age.weeksOld' : 'age.weeksOld_plural', { count: age.weeks });
        if (age.months < 24) return t(age.months === 1 ? 'age.monthsOld' : 'age.monthsOld_plural', { count: age.months });
        const rm = age.months % 12;
        if (rm === 0) return t(age.years === 1 ? 'age.yearsOld' : 'age.yearsOld_plural', { count: age.years });
        return t('age.yearsMonthsOld', { years: age.years, months: rm });
    }, [selectedBaby, t]);

    return (
        <div className="learn-page">
            <motion.div
                className="learn-container"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
            >
                <div className="learn-header">
                    <h1 className="learn-title">
                        <TrendingUp size={24} /> {t('learn.insights')}
                    </h1>
                    {selectedBaby && ageLabel && (
                        <p className="learn-subtitle">
                            <Sparkles size={14} /> {t('learn.forBabyAge', { name: selectedBaby.name, age: ageLabel })}
                        </p>
                    )}
                </div>

                <BabyInsights isPremium={isPremium} />
            </motion.div>
        </div>
    );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useBaby } from '../hooks/useBaby';
import BabyInsights from './BabyInsights';
import { calculateAgeInMonths } from '../utils/ageUtils';
import { TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface LearnProps { isPremium?: boolean; }
export default function Learn({ isPremium = false }: LearnProps) {
    const { t } = useTranslation('common');
    const { selectedBaby } = useBaby();

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
                        <TrendingUp size={24} /> {t('dashboard:learn.insights')}
                    </h1>
                    {selectedBaby && babyAgeMonths !== null && (
                        <p className="learn-subtitle">
                            <Sparkles size={14} /> {t('dashboard:learn.forBaby', { name: selectedBaby.name, months: babyAgeMonths, monthLabel: babyAgeMonths === 1 ? t('dashboard:learn.month') : t('dashboard:learn.months') })}
                        </p>
                    )}
                </div>

                <BabyInsights isPremium={isPremium} />
            </motion.div>
        </div>
    );
}

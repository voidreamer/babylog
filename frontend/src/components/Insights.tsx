/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from 'react';
import { useBaby } from '../hooks/useBaby';
import BabyInsights from './BabyInsights';
import { formatAgeLabel } from '../utils/ageUtils';
import { TrendingUp, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface InsightsProps { isPremium?: boolean; }
export default function Insights({ isPremium = false }: InsightsProps) {
    const { t } = useTranslation('dashboard');
    const { selectedBaby } = useBaby();

    const ageLabel = useMemo(
        () => formatAgeLabel(selectedBaby?.birth_date, t),
        [selectedBaby, t],
    );

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
